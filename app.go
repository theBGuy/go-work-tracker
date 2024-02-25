package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/theBGuy/go-work-tracker/auto_update"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	_ "github.com/mattn/go-sqlite3"
)

// App struct
type App struct {
	ctx                context.Context
	db                 *sql.DB
	startTime          time.Time
	isRunning          bool
	organization       string
	project            string
	version            string
	environment        string
	newVersonAvailable bool
}

type WailsConfig struct {
	Info Info `json:"info"`
}

type Info struct {
	ProductVersion string `json:"productVersion"`
	Environment    string `json:"environment"`
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
		newVersonAvailable = auto_update.CheckForUpdates(version)
	}

	db, err := sql.Open("sqlite3", filepath.Join(dbDir, "worktracker.sqlite"))
	if err != nil {
		panic(err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS work_hours (
        date TEXT NOT NULL,
        organization TEXT NOT NULL,
        project TEXT NOT NULL,
        seconds INTEGER NOT NULL,
        PRIMARY KEY (date, organization, project)
    )`)
	if err != nil {
		panic(err)
	}

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
	a.MonitorTime()
}

// shutdown is called at termination
func (a *App) shutdown(ctx context.Context) {
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}
}

func (a *App) MonitorTime() {
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

func (a *App) NewOrganization(organization string, project string) {
	if organization == "" {
		return
	}
	currentDate := time.Now().Format("2006-01-02")
	_, err := a.db.Exec(
		"INSERT INTO work_hours(date, organization, project, seconds) VALUES(?, ?, ?, ?)",
		currentDate, organization, project, 0)
	if err != nil {
		panic(err)
	}
}

func (a *App) SetOrganization(organization string, project string) {
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}
	// check if the new organization exists
	row := a.db.QueryRow("SELECT organization FROM work_hours WHERE organization = ?", organization)
	var org string
	err := row.Scan(&org)
	if err != nil {
		if err == sql.ErrNoRows {
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
	_, err := a.db.Exec("UPDATE work_hours SET organization = ? WHERE organization = ?", newName, oldName)
	if err != nil {
		panic(err)
	}
}

func (a *App) SetProject(project string) {
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}
	a.project = project
}

func (a *App) RenameProject(organization string, oldName string, newName string) {
	if newName == "" || organization == "" {
		return
	}
	_, err := a.db.Exec(
		"UPDATE work_hours SET project = ? WHERE organization = ? AND project = ?",
		newName, organization, oldName)
	if err != nil {
		panic(err)
	}
}

func (a *App) DeleteProject(organization string, project string) {
	if project == "" || organization == "" {
		return
	}
	_, err := a.db.Exec("DELETE FROM work_hours WHERE organization = ? AND project = ?",
		organization, project)
	if err != nil {
		panic(err)
	}
}

// GetProjects returns the list of projects for the specified organization
func (a *App) GetProjects(organization string) (projects []string, err error) {
	projects = []string{}
	rows, err := a.db.Query("SELECT DISTINCT project FROM work_hours WHERE organization = ?", organization)
	if err != nil {
		return projects, err
	}
	defer rows.Close()

	for rows.Next() {
		var project string
		if err := rows.Scan(&project); err != nil {
			return projects, err
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return projects, err
	}

	return projects, nil
}

func (a *App) DeleteOrganization(organization string) {
	if organization == "" {
		return
	}
	_, err := a.db.Exec("DELETE FROM work_hours WHERE organization = ?", organization)
	if err != nil {
		panic(err)
	}
}

func (a *App) GetOrganizations() (organizations []string, err error) {
	organizations = []string{}
	rows, err := a.db.Query("SELECT DISTINCT organization FROM work_hours")
	if err != nil {
		return organizations, err
	}
	defer rows.Close()

	for rows.Next() {
		var organization string
		if err := rows.Scan(&organization); err != nil {
			return organizations, err
		}
		organizations = append(organizations, organization)
	}

	if err := rows.Err(); err != nil {
		return organizations, err
	}

	return organizations, nil
}

func (a *App) StartTimer(organization string, project string) {
	a.startTime = time.Now()
	a.organization = organization
	a.project = project
	a.isRunning = true
}

func (a *App) StopTimer(organization string, project string) {
	if !a.isRunning {
		return
	}
	endTime := time.Now()
	secsWorked := int(endTime.Sub(a.startTime).Seconds())
	date := a.startTime.Format("2006-01-02")

	_, err := a.db.Exec("INSERT INTO work_hours(date, organization, project, seconds) VALUES(?, ?, ?, ?) "+
		"ON CONFLICT(date, organization, project) DO UPDATE SET seconds=seconds+?", date, organization, project, secsWorked, secsWorked)
	if err != nil {
		panic(err)
	}
	a.isRunning = false
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
	row := a.db.QueryRow("SELECT seconds FROM work_hours WHERE date = ? AND organization = ?", date, organization)

	err = row.Scan(&seconds)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("No entry for the given date: ", date, organization)
			// No entry for the given date
			return 0, nil
		}
		return 0, err
	}

	return seconds, nil
}

// GetWorkTimeByProject returns the total seconds worked for the specified project on specific date
func (a *App) GetWorkTimeByProject(organization string, project string, date string) (seconds int, err error) {
	if project == "" || organization == "" {
		return 0, nil
	}
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	row := a.db.QueryRow(
		"SELECT COALESCE(SUM(seconds), 0) FROM work_hours WHERE date = ? AND project = ? AND organization = ?",
		date, project, organization)

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
func (a *App) GetWeeklyWorkTime(year int, month time.Month, organization string) (weeklyWorkTimes map[int]int, err error) {
	weeklyWorkTimes = make(map[int]int)
	rows, err := a.db.Query(
		"SELECT strftime('%W', date), COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y-%m', date) = ? AND organization = ? GROUP BY strftime('%W', date)",
		fmt.Sprintf("%04d-%02d", year, month), organization)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var week int
		var seconds int
		if err := rows.Scan(&week, &seconds); err != nil {
			return nil, err
		}
		weeklyWorkTimes[week] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return weeklyWorkTimes, nil
}

// GetMonthlyWorkTime returns the total seconds worked for each month of the specified year
func (a *App) GetMonthlyWorkTime(year int, organization string) (monthlyWorkTimes []int, err error) {
	rows, err := a.db.Query(
		"SELECT strftime('%m', date), COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ? GROUP BY strftime('%m', date)",
		strconv.Itoa(year), organization)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	monthlyWorkTimes = make([]int, 12)
	for rows.Next() {
		var month int
		var seconds int
		if err := rows.Scan(&month, &seconds); err != nil {
			return nil, err
		}
		monthlyWorkTimes[month-1] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return monthlyWorkTimes, nil
}

// GetMonthlyWorktimeByProject returns the total seconds worked for each project for the specified month
func (a *App) GetMonthlyWorktimeByProject(year int, month time.Month, organization string) (monthlyWorkTimes map[string]int, err error) {
	monthlyWorkTimes = make(map[string]int)
	rows, err := a.db.Query(
		"SELECT project, COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y-%m', date) = ? AND organization = ? GROUP BY project",
		fmt.Sprintf("%04d-%02d", year, month), organization)
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
		monthlyWorkTimes[project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return monthlyWorkTimes, nil
}

// GetYearlyWorkTime returns the total seconds worked for the specified year
func (a *App) GetYearlyWorkTime(year int, organization string) (yearlyWorkTime int, err error) {
	row := a.db.QueryRow("SELECT COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ?",
		strconv.Itoa(year), organization)

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
	rows, err := a.db.Query(
		"SELECT project, COALESCE(SUM(seconds), 0) FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ? GROUP BY project",
		strconv.Itoa(year), organization)
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
