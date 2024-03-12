package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/theBGuy/go-work-tracker/auto_update"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	_ "github.com/mattn/go-sqlite3"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// App struct
type App struct {
	ctx                context.Context
	db                 *gorm.DB
	startTime          time.Time
	lastSave           time.Time
	isRunning          bool
	organization       string
	project            string
	version            string
	environment        string
	newVersonAvailable bool
}

var ctx context.Context
var cancel context.CancelFunc

type WailsConfig struct {
	Info Info `json:"info"`
}

type Info struct {
	ProductVersion string `json:"productVersion"`
	Environment    string `json:"environment"`
}

type WorkHours struct {
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
	Date         string    `gorm:"primary_key"`
	Organization string    `gorm:"primary_key"`
	Project      string    `gorm:"primary_key;default:'default'"`
	Seconds      int
}

// NewApp creates a new App application struct
func NewApp() *App {
	version := os.Getenv("APP_ENV")
	if version == "" {
		version, _ = readVersionConfig(WailsConfigFile)
	}

	environment := os.Getenv("APP_ENV")
	if environment == "" {
		environment, _ = readEnvConfig(WailsConfigFile)
	}

	dbDir, err := getSaveDir(environment)
	if err != nil {
		panic(err)
	}
	fmt.Println("Starting Go Work Tracker. \nVersion: ", version, "\nEnvironment: ", environment, "\nSave directory: ", dbDir)

	// Check for updates
	var newVersonAvailable bool
	if environment == "production" {
		newVersonAvailable = auto_update.Run(version)
	}

	db, err := gorm.Open(sqlite.Open(filepath.Join(dbDir, "worktracker.sqlite")), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	err = db.AutoMigrate(&WorkHours{})
	if err != nil {
		panic(err)
	}

	fixOutdatedDb(db)

	return &App{
		db:                 db,
		version:            version,
		environment:        environment,
		newVersonAvailable: newVersonAvailable,
	}
}

func (a *App) GetVersion() string {
	return a.version
}

func (a *App) UpdateAvailable() bool {
	return a.newVersonAvailable
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.monitorTime()
	a.monitorUpdates()
}

// shutdown is called at termination
func (a *App) shutdown(ctx context.Context) {
	fmt.Println("Shutting down...")
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}
}

func (a *App) monitorTime() {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for range ticker.C {
			if a.isRunning && time.Now().Format("2006-01-02") != a.startTime.Format("2006-01-02") {
				a.StopTimer(a.organization, a.project)
				a.StartTimer(a.organization, a.project)
			}
		}
	}()
}

func (a *App) monitorUpdates() {
	if a.environment != "production" {
		return
	}
	ticker := time.NewTicker(1 * time.Hour)

	runtime.EventsOn(a.ctx, "do-update", func(optionalData ...interface{}) {
		a.shutdown(a.ctx)
		auto_update.Run(a.version)
	})

	go func() {
		for range ticker.C {
			if !a.newVersonAvailable {
				newVersonAvailable, _ := auto_update.GetUpdateAvailable(a.version)
				if newVersonAvailable {
					a.newVersonAvailable = true
					runtime.EventsEmit(a.ctx, "update-available")
				}
			}
		}
	}()
}

func (a *App) NewOrganization(organization string, project string) {
	if organization == "" {
		return
	}
	currentDate := time.Now().Format("2006-01-02")
	err := a.db.Create(&WorkHours{
		Date:         currentDate,
		Organization: organization,
		Project:      project,
		Seconds:      0,
	}).Error
	if err != nil {
		panic(err)
	}
}

func (a *App) SetOrganization(organization string, project string) {
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}
	// check if the new organization exists
	if err := a.db.Where("organization = ?", organization).First(&WorkHours{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No entry for the given organization
			a.NewOrganization(organization, project)
		}
	}

	a.organization = organization
	a.project = project
}

func (a *App) RenameOrganization(oldName string, newName string) {
	if newName == "" {
		return
	}
	err := a.db.Model(&WorkHours{}).
		Where("organization = ?", oldName).
		Update("organization", newName).Error
	if err != nil {
		panic(err)
	}
}

// Create a new project for the specified organization
func (a *App) NewProject(organization string, project string) {
	if project == "" || organization == "" {
		return
	}
	currentDate := time.Now().Format("2006-01-02")
	err := a.db.Create(&WorkHours{
		Date:         currentDate,
		Organization: organization,
		Project:      project,
		Seconds:      0,
	}).Error
	if err != nil {
		panic(err)
	}
}

func (a *App) SetProject(project string) {
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}
	fmt.Println("Project set to:", project, "for Organization:", a.organization)
	a.project = project
}

func (a *App) RenameProject(organization string, oldName string, newName string) {
	if newName == "" || organization == "" {
		return
	}
	err := a.db.Model(&WorkHours{}).
		Where("organization = ? AND project = ?", organization, oldName).
		Update("project", newName).Error
	if err != nil {
		panic(err)
	}
}

func (a *App) DeleteProject(organization string, project string) {
	if project == "" || organization == "" {
		return
	}
	err := a.db.
		Where("organization = ? AND project = ?", organization, project).
		Delete(&WorkHours{}).Error
	if err != nil {
		panic(err)
	}
}

// GetProjects returns the list of projects for the specified organization
func (a *App) GetProjects(organization string) (projects []string, err error) {
	projects = []string{}
	err = a.db.Model(&WorkHours{}).
		Where("organization = ?", organization).
		Distinct().
		Pluck("project", &projects).Error
	if err != nil {
		return nil, err
	}

	return projects, nil
}

func (a *App) DeleteOrganization(organization string) {
	if organization == "" {
		return
	}
	err := a.db.Where("organization = ?", organization).Delete(&WorkHours{}).Error
	if err != nil {
		panic(err)
	}
}

func (a *App) GetOrganizations() (organizations []string, err error) {
	organizations = []string{}
	err = a.db.Model(&WorkHours{}).Distinct().Pluck("organization", &organizations).Error
	if err != nil {
		return nil, err
	}

	return organizations, nil
}

func (a *App) StartTimer(organization string, project string) {
	a.startTime = time.Now()
	a.organization = organization
	a.project = project
	a.isRunning = true

	ctx, cancel = context.WithCancel(context.Background())

	go func() {
		for {
			select {
			case <-time.After(1 * time.Minute):
				a.saveTimer(a.organization, a.project)
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (a *App) saveTimer(organization string, project string) {
	endTime := time.Now()
	secsWorked := 0
	if !a.lastSave.IsZero() {
		// If lastSave is set, calculate the seconds worked since the last save
		secsWorked = int(endTime.Sub(a.lastSave).Seconds())
	} else {
		// If lastSave is not set, calculate the seconds worked since the timer started
		secsWorked = int(endTime.Sub(a.startTime).Seconds())
	}
	date := a.startTime.Format("2006-01-02")

	workHours := WorkHours{
		Date:         date,
		Organization: organization,
		Project:      project,
		Seconds:      0,
	}
	err := a.db.FirstOrCreate(&workHours, WorkHours{Date: date, Organization: organization, Project: project}).Error
	if err != nil {
		panic(err)
	}

	err = a.db.Model(&workHours).Update("seconds", gorm.Expr("seconds + ?", secsWorked)).Error
	if err != nil {
		panic(err)
	}
	a.lastSave = time.Now()
}

func (a *App) StopTimer(organization string, project string) {
	if !a.isRunning {
		return
	}
	a.saveTimer(organization, project)
	cancel()
	a.isRunning = false
	a.lastSave = time.Time{}
}

// TimeElapsed returns the total seconds worked in the current timer session
func (a *App) TimeElapsed() int {
	if a.isRunning {
		return int(time.Since(a.startTime).Seconds())
	}
	return 0
}

func (a *App) ShowWindow() {
	runtime.WindowShow(a.ctx)
}

// Display a confirmation dialog
func (a *App) ConfirmAction(title string, message string) bool {
	selection, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         title,
		Message:       message,
		DefaultButton: "No",
	})
	if err != nil {
		fmt.Println(err)
		return false
	}
	return selection == "Yes"
}

// GetWorkTime returns the total seconds worked on the specified date
func (a *App) GetWorkTime(date string, organization string) (seconds int, err error) {
	if date == "" || organization == "" {
		// fmt.Println("Date or organization is empty", date, organization)
		return 0, nil
	}

	// return seconds, nil
	var workHours WorkHours
	if err = a.db.Where("date = ? AND organization = ?", date, organization).First(&workHours).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Println("No entry for the given date: ", date, organization)
			// No entry for the given date
			return 0, nil
		}
		return 0, err
	}
	return workHours.Seconds, nil
}

// GetWorkTimeByProject returns the total seconds worked for the specified project on specific date
func (a *App) GetWorkTimeByProject(organization string, project string, date string) (seconds int, err error) {
	if project == "" || organization == "" {
		return 0, nil
	}
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	row := a.db.Model(&WorkHours{}).
		Where("date = ? AND project = ? AND organization = ?", date, project, organization).
		Select("COALESCE(SUM(seconds), 0)").
		Row()

	err = row.Scan(&seconds)
	if err != nil {
		if err == sql.ErrNoRows {
			// No entry for the given project
			return 0, nil
		}
		return 0, err
	}

	return seconds, nil
}

// GetWeeklyWorkTime returns the total seconds worked for each week of the specified month
func (a *App) GetWeeklyWorkTime(year int, month time.Month, organization string) (weeklyWorkTimes map[int]map[string]int, err error) {
	weeklyWorkTimes = make(map[int]map[string]int)
	rows, err := a.db.Model(&WorkHours{}).
		Select("strftime('%W', date) - strftime('%W', date('now','start of month')) as week, project, COALESCE(SUM(seconds), 0)").
		Where("strftime('%Y-%m', date) = ? AND organization = ?", fmt.Sprintf("%04d-%02d", year, month), organization).
		Group("week, project").
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var week int
		var project string
		var seconds int
		if err := rows.Scan(&week, &project, &seconds); err != nil {
			return nil, err
		}
		if _, ok := weeklyWorkTimes[week]; !ok {
			weeklyWorkTimes[week] = make(map[string]int)
		}
		weeklyWorkTimes[week][project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return weeklyWorkTimes, nil
}

// GetWeeklkyProjectWorktimes returns the total seconds worked for each project for the specified week
//
// Deprecated: Use GetWeeklyWorkTime instead - is there any reason to keep this function?
// func (a *App) GetWeeklyProjectWorktimes(year int, month time.Month, week int, organization string) (weeklyWorkTimes map[string]int, err error) {
// 	weeklyWorkTimes = make(map[string]int)
// 	rows, err := a.db.Query(
// 		`SELECT project, COALESCE(SUM(seconds), 0)
// 				FROM work_hours
// 				WHERE strftime('%Y-%m', date) = ? AND organization = ? AND strftime('%W', date) - strftime('%W', date('now','start of month')) = ?
// 				GROUP BY project`,
// 		fmt.Sprintf("%04d-%02d", year, month), organization, week)
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	for rows.Next() {
// 		var project string
// 		var seconds int
// 		if err := rows.Scan(&project, &seconds); err != nil {
// 			return nil, err
// 		}
// 		weeklyWorkTimes[project] = seconds
// 	}

// 	if err := rows.Err(); err != nil {
// 		return nil, err
// 	}

// 	return weeklyWorkTimes, nil
// }

// GetMonthlyWorkTime returns the total seconds worked for each month of the specified year
func (a *App) GetMonthlyWorkTime(year int, organization string) (monthlyWorkTimes map[int]map[string]int, err error) {
	// rows, err := a.db.Query(
	// 	"SELECT strftime('%m', date), project, COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ? GROUP BY strftime('%m', date), project",
	// 	strconv.Itoa(year), organization)
	rows, err := a.db.Model(&WorkHours{}).
		Select("strftime('%m', date) as month, project, COALESCE(SUM(seconds), 0) as seconds").
		Where("strftime('%Y', date) = ? AND organization = ?", fmt.Sprintf("%04d", year), organization).
		Group("month, project").
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	monthlyWorkTimes = make(map[int]map[string]int)
	for rows.Next() {
		var month int
		var project string
		var seconds int
		if err := rows.Scan(&month, &project, &seconds); err != nil {
			return nil, err
		}
		if _, ok := monthlyWorkTimes[month]; !ok {
			monthlyWorkTimes[month] = make(map[string]int)
		}
		monthlyWorkTimes[month][project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return monthlyWorkTimes, nil
}

// GetMonthlyWorktimeByProject returns the total seconds worked for each project for the specified month
//
// Deprecated: Use GetMonthlyWorkTime instead - is there any reason to keep this function?
// func (a *App) GetMonthlyWorktimeByProject(year int, month time.Month, organization string) (monthlyWorkTimes map[string]int, err error) {
// 	monthlyWorkTimes = make(map[string]int)
// 	rows, err := a.db.Query(
// 		"SELECT project, COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y-%m', date) = ? AND organization = ? GROUP BY project",
// 		fmt.Sprintf("%04d-%02d", year, month), organization)
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	for rows.Next() {
// 		var project string
// 		var seconds int
// 		if err := rows.Scan(&project, &seconds); err != nil {
// 			return nil, err
// 		}
// 		monthlyWorkTimes[project] = seconds
// 	}

// 	if err := rows.Err(); err != nil {
// 		return nil, err
// 	}

// 	return monthlyWorkTimes, nil
// }

// GetYearlyWorkTime returns the total seconds worked for the specified year
func (a *App) GetYearlyWorkTime(year int, organization string) (yearlyWorkTime int, err error) {
	row := a.db.Model(&WorkHours{}).
		Select("COALESCE(SUM(seconds), 0)").
		Where("strftime('%Y', date) = ? AND organization = ?", fmt.Sprintf("%04d", year), organization).
		Row()

	err = row.Scan(&yearlyWorkTime)
	if err != nil {
		if err == sql.ErrNoRows {
			// No entry for the given year
			return 0, nil
		}
		return 0, err
	}

	return yearlyWorkTime, nil
}

// GetYearlyWorkTimeByProject returns the total seconds worked for each project for the specified year
func (a *App) GetYearlyWorkTimeByProject(year int, organization string) (yearlyWorkTimes map[string]int, err error) {
	yearlyWorkTimes = make(map[string]int)
	rows, err := a.db.Model(&WorkHours{}).
		Select("project, COALESCE(SUM(seconds), 0) as seconds").
		Where("strftime('%Y', date) = ? AND organization = ?", fmt.Sprintf("%04d", year), organization).
		Group("project").
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var project string
		var seconds int
		if err := rows.Scan(&project, &seconds); err != nil {
			return nil, err
		}
		yearlyWorkTimes[project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return yearlyWorkTimes, nil
}
