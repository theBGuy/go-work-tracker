package main

import (
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type WorkHours struct {
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
	Date         string    `gorm:"primary_key"`
	Organization string    `gorm:"primary_key"`
	Project      string    `gorm:"primary_key;default:'default'"`
	Seconds      int
}

func NewDb(dbDir string) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(filepath.Join(dbDir, "worktracker.sqlite")), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	err = db.AutoMigrate(&WorkHours{})
	if err != nil {
		panic(err)
	}

	fixOutdatedDb(db)
	return db
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

// GetMonthlyWorkTime returns the total seconds worked for each month of the specified year
func (a *App) GetMonthlyWorkTime(year int, organization string) (monthlyWorkTimes map[int]map[string]int, err error) {
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
