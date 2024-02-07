package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// App struct
type App struct {
	ctx          context.Context
	db           *sql.DB
	startTime    time.Time
	isRunning    bool
	organization string
}

// NewApp creates a new App application struct
func NewApp() *App {
	db, err := sql.Open("sqlite3", "./worktracker.sqlite")
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
	return &App{db: db}
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
		for {
			select {
			case <-ticker.C:
				if a.isRunning && time.Now().Format("2006-01-02") != a.startTime.Format("2006-01-02") {
					a.StopTimer(a.organization)
					a.StartTimer(a.organization)
				}
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

// GetWorkTime returns the total seconds worked
func (a *App) GetWorkTime(date string, organization string) (seconds int, err error) {
	if date == "" || organization == "" {
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
		"SELECT strftime('%m', date), SUM(seconds) FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ? GROUP BY strftime('%m', date)",
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
	row := a.db.QueryRow("SELECT SUM(seconds) FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ?",
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

func (a *App) ExportCSVByMonth(organization string, year int, month time.Month) {
	// Query the database for all entries in the specified month and organization
	rows, err := a.db.Query(
		"SELECT date, seconds FROM work_hours WHERE strftime('%Y-%m', date) = ? AND organization = ? ORDER BY date",
		fmt.Sprintf("%04d-%02d", year, month), organization)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	// Initialize variables to store the daily and weekly totals
	dailyTotals := make(map[string]int)
	weeklyTotals := make(map[int]int)
	monthlyTotal := 0

	var dates []string

	// Iterate over the rows and calculate the daily, weekly, and monthly totals
	for rows.Next() {
		var date string
		var seconds int
		if err := rows.Scan(&date, &seconds); err != nil {
			panic(err)
		}

		if _, ok := dailyTotals[date]; !ok {
			dates = append(dates, date)
		}
		dailyTotals[date] += seconds
		parsedDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			panic(err)
		}
		// _, week := parsedDate.ISOWeek()
		day := parsedDate.Day()
		week := (day-1)/7 + 1
		weeklyTotals[week] += seconds
		monthlyTotal += seconds
	}

	if err := rows.Err(); err != nil {
		panic(err)
	}

	// Create the directories for the organization, year, and month
	dir := filepath.Join("csv", organization, strconv.Itoa(year), month.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}

	// Create the CSV file
	csvFile, err := os.Create(filepath.Join(dir, "work_hours.csv"))
	if err != nil {
		panic(err)
	}
	defer csvFile.Close()

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write the daily totals to the CSV file
	writer.Write([]string{"Date", "Seconds", "Time (HH:MM:SS)"})
	for _, date := range dates {
		seconds := dailyTotals[date]
		time := formatTime(seconds)
		writer.Write([]string{date, strconv.Itoa(seconds), time})
	}

	// Write the weekly totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Week", "Seconds", "Time (HH:MM:SS)"})
	for week, seconds := range weeklyTotals {
		time := formatTime(seconds)
		writer.Write([]string{strconv.Itoa(week), strconv.Itoa(seconds), time})
	}

	// Write the monthly total to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Month", "Seconds", "Time (HH:MM:SS)"})
	time := formatTime(monthlyTotal)
	writer.Write([]string{month.String(), strconv.Itoa(monthlyTotal), time})
}

func (a *App) ExportCSVByYear(organization string, year int) {
	// Query the database for all entries in the given year
	rows, err := a.db.Query(
		"SELECT date, seconds FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ? ORDER BY date",
		strconv.Itoa(year), organization)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	// Initialize variables to store the monthly totals
	monthlyTotals := make(map[int]int)
	yearlyTotal := 0

	// Iterate over the rows and calculate the monthly and yearly totals
	for rows.Next() {
		var date string
		var seconds int
		if err := rows.Scan(&date, &seconds); err != nil {
			panic(err)
		}

		parsedDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			panic(err)
		}
		month := int(parsedDate.Month())
		monthlyTotals[month] += seconds
		yearlyTotal += seconds
	}

	if err := rows.Err(); err != nil {
		panic(err)
	}

	// Create the directories for the organization and year
	dir := filepath.Join("csv", organization, strconv.Itoa(year))
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}

	// Create the CSV file
	csvFile, err := os.Create(filepath.Join(dir, "work_hours_yearly.csv"))
	if err != nil {
		panic(err)
	}
	defer csvFile.Close()

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write the monthly totals to the CSV file
	writer.Write([]string{"Month", "Seconds", "Time (HH:MM:SS)"})
	for _, seconds := range monthlyTotals {
		time := formatTime(seconds)
		writer.Write([]string{time, strconv.Itoa(seconds), time})
	}

	// Write the yearly total to the CSV file
	writer.Write([]string{"Year", "Seconds", "Time (HH:MM:SS)"})
	time := formatTime(yearlyTotal)
	writer.Write([]string{strconv.Itoa(year), strconv.Itoa(yearlyTotal), time})
}

func formatTime(seconds int) string {
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	seconds %= 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}

func (a *App) GenerateFakeData(organization string) {
	// Get the current year and month
	now := time.Now()
	year, month, _ := now.Date()

	// Clear the work_hours table
	_, err := a.db.Exec("DELETE FROM work_hours")
	if err != nil {
		panic(err)
	}

	// Calculate the number of days in the current month
	daysInMonth := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()

	// Generate fake data for each day of the month
	for day := 1; day <= daysInMonth; day++ {
		// Generate a random number of seconds between 1 hour (3600 seconds) and 8 hours (28800 seconds)
		seconds := rand.Intn(28800-3600) + 3600

		date := fmt.Sprintf("%04d-%02d-%02d", year, month, day)

		_, err := a.db.Exec("INSERT INTO work_hours(date, organization, seconds) VALUES(?, ?)", date, seconds)
		if err != nil {
			panic(err)
		}
	}
}
