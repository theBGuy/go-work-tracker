package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

func getSaveDir(environment string) (string, error) {
	var dataDir string
	switch runtime.GOOS {
	case "windows":
		dataDir = os.Getenv("APPDATA")
	case "darwin":
		dataDir = filepath.Join(os.Getenv("HOME"), "Library", "Application Support")
	default: // Unix-like system
		dataDir = os.Getenv("XDG_DATA_HOME")
		if dataDir == "" {
			dataDir = filepath.Join(os.Getenv("HOME"), ".local", "share")
		}
	}

	saveDir := filepath.Join(dataDir, "Go-Work-Tracker")

	if environment == "development" {
		fmt.Println("Running in development mode")
		saveDir = filepath.Join(saveDir, "dev")
	}

	if _, err := os.Stat(saveDir); os.IsNotExist(err) {
		os.Mkdir(saveDir, 0755)
	}
	return saveDir, nil
}

func readVersionConfig(WailsConfigFile []byte) (string, error) {
	var wailsConfig WailsConfig
	err := json.Unmarshal(WailsConfigFile, &wailsConfig)
	if err != nil {
		return "", err
	}
	return wailsConfig.Info.ProductVersion, nil
}

func readEnvConfig(WailsConfigFile []byte) (string, error) {
	var wailsConfig WailsConfig
	err := json.Unmarshal(WailsConfigFile, &wailsConfig)
	if err != nil {
		return "", err
	}
	return wailsConfig.Info.Environment, nil
}

// fixOutdatedDb checks if the database is outdated and updates it if necessary
// This is necessary because the primary key setup for the work_hours table was changed in version 0.2.0
func fixOutdatedDb(db *sql.DB) {
	// Query the sqlite_master table to get the SQL used to create the work_hours table
	row := db.QueryRow("SELECT sql FROM sqlite_master WHERE type='table' AND name='work_hours'")
	var createSQL string
	err := row.Scan(&createSQL)
	if err != nil {
		panic(err)
	}

	// Check if the primary key setup matches the expected setup
	expected := "PRIMARY KEY(date, organization, project)"
	if !strings.Contains(createSQL, expected) {
		log.Println("Database is outdated, updating...")
		_, err = db.Exec(`ALTER TABLE work_hours ADD COLUMN project TEXT`)
		if err != nil {
			fmt.Println(err.Error())
			if strings.Contains(err.Error(), "duplicate column name") {
				// Column already exists, so ignore the error
			} else {
				panic(err)
			}
		}

		_, err = db.Exec(`UPDATE work_hours SET project = 'default' WHERE project IS NULL`)
		if err != nil {
			panic(err)
		}
		// Drop new_work_hours table if it exists - leftover from previous migration or crash
		_, err = db.Exec(`DROP TABLE IF EXISTS new_work_hours`)
		if err != nil {
			panic(err)
		}

		// Create new table
		_, err := db.Exec(`CREATE TABLE new_work_hours (
			date TEXT NOT NULL,
			organization TEXT NOT NULL,
			project TEXT NOT NULL DEFAULT 'default',
			seconds INTEGER NOT NULL,
			PRIMARY KEY(date, organization, project)
		)`)
		if err != nil {
			panic(err)
		}

		// Copy data from old table to new table
		_, err = db.Exec(`INSERT INTO new_work_hours(date, organization, project, seconds)
			SELECT date, organization, IFNULL(project, 'default'), seconds
			FROM work_hours`)
		if err != nil {
			panic(err)
		}

		// Delete old table
		_, err = db.Exec(`DROP TABLE work_hours`)
		if err != nil {
			panic(err)
		}

		// Rename new table to old table name
		_, err = db.Exec(`ALTER TABLE new_work_hours RENAME TO work_hours`)
		if err != nil {
			panic(err)
		}
	}
}

type ExportType string
type ProjectTotal struct {
	Name    string
	Seconds int
}

const (
	CSV ExportType = "csv"
	PDF ExportType = "pdf"
)

var monthMap = map[int]string{
	1:  "January",
	2:  "February",
	3:  "March",
	4:  "April",
	5:  "May",
	6:  "June",
	7:  "July",
	8:  "August",
	9:  "September",
	10: "October",
	11: "November",
	12: "December",
}

func formatTime(seconds int) string {
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	seconds %= 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}

func (a *App) getMonthlyTotals(organization string, year int, month time.Month) (map[string]map[string]int, map[int]map[string]int, []ProjectTotal, int, []string) {
	rows, err := a.db.Query(
		"SELECT date, project, seconds FROM work_hours WHERE strftime('%Y-%m', date) = ? AND organization = ? ORDER BY date",
		fmt.Sprintf("%04d-%02d", year, month), organization)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var dates []string
	// Initialize variables to store the daily and weekly totals
	dailyTotals := make(map[string]map[string]int) // map[date]map[project]seconds
	weeklyTotals := make(map[int]map[string]int)   // map[week]map[project]seconds
	monthlyTotals := make(map[string]int)          // map[project]seconds
	monthlyTotal := 0

	// Iterate over the rows and calculate the daily, weekly, and monthly totals
	for rows.Next() {
		var date string
		var project string
		var seconds int
		if err := rows.Scan(&date, &project, &seconds); err != nil {
			panic(err)
		}

		if _, ok := dailyTotals[date]; !ok {
			dates = append(dates, date)
			dailyTotals[date] = make(map[string]int)
		}
		dailyTotals[date][project] += seconds
		parsedDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			panic(err)
		}
		day := parsedDate.Day()
		week := (day-1)/7 + 1
		if _, ok := weeklyTotals[week]; !ok {
			weeklyTotals[week] = make(map[string]int)
		}
		weeklyTotals[week][project] += seconds
		if _, ok := monthlyTotals[project]; !ok {
			monthlyTotals[project] = 0
		}
		monthlyTotals[project] += seconds
		monthlyTotal += seconds
	}

	if err := rows.Err(); err != nil {
		panic(err)
	}

	// Convert the map to a slice of ProjectTotal
	var projectTotals []ProjectTotal
	for project, seconds := range monthlyTotals {
		projectTotals = append(projectTotals, ProjectTotal{Name: project, Seconds: seconds})
	}

	// Sort the slice by seconds in descending order
	sort.Slice(projectTotals, func(i, j int) bool {
		return projectTotals[i].Seconds > projectTotals[j].Seconds
	})
	return dailyTotals, weeklyTotals, projectTotals, monthlyTotal, dates
}

func (a *App) getYearlyTotals(organization string, year int) (map[string]map[string]int, []ProjectTotal, int) {
	rows, err := a.db.Query(
		"SELECT date, project, seconds FROM work_hours WHERE strftime('%Y', date) = ? AND organization = ? ORDER BY date",
		strconv.Itoa(year), organization)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	// Initialize variables to store the monthly totals
	monthlyTotals := make(map[string]map[string]int) // map[month]map[project]seconds
	yearlyTotals := make(map[string]int)             // map[project]seconds
	yearlyTotal := 0

	// Iterate over the rows and calculate the monthly and yearly totals
	for rows.Next() {
		var date string
		var project string
		var seconds int
		if err := rows.Scan(&date, &project, &seconds); err != nil {
			panic(err)
		}

		parsedDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			panic(err)
		}
		month := int(parsedDate.Month())
		if _, ok := monthlyTotals[monthMap[month]]; !ok {
			monthlyTotals[monthMap[month]] = make(map[string]int)
		}
		monthlyTotals[monthMap[month]][project] += seconds
		if _, ok := yearlyTotals[project]; !ok {
			yearlyTotals[project] = 0
		}
		yearlyTotals[project] += seconds
		yearlyTotal += seconds
	}

	if err := rows.Err(); err != nil {
		panic(err)
	}

	// Convert the map to a slice of ProjectTotal
	var projectTotals []ProjectTotal
	for project, seconds := range yearlyTotals {
		projectTotals = append(projectTotals, ProjectTotal{Name: project, Seconds: seconds})
	}

	// Sort the slice by seconds in descending order
	sort.Slice(projectTotals, func(i, j int) bool {
		return projectTotals[i].Seconds > projectTotals[j].Seconds
	})
	return monthlyTotals, projectTotals, yearlyTotal
}

func (a *App) ExportByMonth(exportType ExportType, organization string, year int, month time.Month) (string, error) {
	log.Println("Exporting by month...", exportType, organization, year, month)
	if exportType == CSV {
		return a.exportCSVByMonth(organization, year, month)
	} else if exportType == PDF {
		return a.exportPDFByMonth(organization, year, month)
	} else {
		return "", fmt.Errorf("invalid export type")
	}
}

func (a *App) ExportByYear(exportType ExportType, organization string, year int) (string, error) {
	log.Println("Exporting by year...", exportType, organization, year)
	if exportType == CSV {
		return a.exportCSVByYear(organization, year)
	} else if exportType == PDF {
		return a.exportPDFByYear(organization, year)
	} else {
		return "", fmt.Errorf("invalid export type")
	}
}
