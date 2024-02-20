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
			seconds INTEGER NOT NULL,
			PRIMARY KEY (date, organization)
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
		a.StopTimer(a.organization)
	}
}

func (a *App) MonitorTime() {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for range ticker.C {
			if a.isRunning && time.Now().Format("2006-01-02") != a.startTime.Format("2006-01-02") {
				a.StopTimer(a.organization)
				a.StartTimer(a.organization)
			}
		}
	}()
}

func (a *App) NewOrganization(organization string) {
	if organization == "" {
		return
	}
	currentDate := time.Now().Format("2006-01-02")
	_, err := a.db.Exec("INSERT INTO work_hours(date, organization, seconds) VALUES(?, ?, ?)", currentDate, organization, 0)
	if err != nil {
		panic(err)
	}
}

func (a *App) SetOrganization(organization string) {
	if a.isRunning {
		a.StopTimer(a.organization)
	}
	// check if the new organization exists
	row := a.db.QueryRow("SELECT organization FROM work_hours WHERE organization = ?", organization)
	var org string
	err := row.Scan(&org)
	if err != nil {
		if err == sql.ErrNoRows {
			// No entry for the given organization
			a.NewOrganization(organization)
		}
	}

	a.organization = organization
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

func (a *App) StartTimer(organization string) {
	a.startTime = time.Now()
	a.organization = organization
	a.isRunning = true
}

func (a *App) StopTimer(organization string) {
	if !a.isRunning {
		return
	}
	endTime := time.Now()
	secsWorked := int(endTime.Sub(a.startTime).Seconds())
	date := a.startTime.Format("2006-01-02")

	_, err := a.db.Exec("INSERT INTO work_hours(date, organization, seconds) VALUES(?, ?, ?) "+
		"ON CONFLICT(date, organization) DO UPDATE SET seconds=seconds+?", date, organization, secsWorked, secsWorked)
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

// GetWorkTime returns the total seconds worked
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
