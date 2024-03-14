package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
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
		Logger.Println("Running in development mode")
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

func containsAll(str string, keys []string) bool {
	for _, key := range keys {
		if !strings.Contains(str, key) {
			return false
		}
	}
	return true
}

// fixOutdatedDb checks if the database is outdated and updates it if necessary
// This is necessary because the primary key setup for the work_hours table was changed in version 0.2.0
// and the database is now managed by GORM in version 0.5.0
// normalized database in 0.6.0 so handle transition from old single table to new normalized tables
func fixOutdatedDb(db *gorm.DB) {
	// Query the sqlite_master table to get the SQL used to create the work_hours table
	row := db.Raw("SELECT sql FROM sqlite_master WHERE type='table' AND name='work_hours'").Row()
	var createSQL string
	err := row.Scan(&createSQL)
	if err != nil {
		panic(err)
	}

	// Check if the primary key setup matches the expected setup
	createSQL = strings.ReplaceAll(createSQL, " ", "")
	gormKeys := []string{"created_at", "updated_at", "project_id"}

	if !containsAll(createSQL, gormKeys) {
		Logger.Println("Database is outdated, updating...")

		type NewWorkHours struct {
			gorm.Model
			Date      string
			Seconds   int
			ProjectID uint
		}

		// Create new table
		err := db.AutoMigrate(&NewWorkHours{}, &Project{}, &Organization{})
		if err != nil {
			panic(err)
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				// If there is a panic, rollback the transaction
				tx.Rollback()
			}
		}()
		if tx.Error != nil {
			panic(tx.Error)
		}

		// Check if the 'deleted_at' column exists in the 'work_hours' table
		if !db.Migrator().HasColumn(&WorkHours{}, "deleted_at") {
			err := db.Migrator().AddColumn(&WorkHours{}, "deleted_at")
			if err != nil {
				panic(err)
			}
		}

		// Copy data from old table to new tables
		rows, err := tx.Raw("SELECT DISTINCT date, organization, project, seconds FROM work_hours").Rows()
		if err != nil {
			panic(err)
		}
		defer rows.Close()

		for rows.Next() {
			var date, organizationName, projectName string
			var seconds int
			if err := rows.Scan(&date, &organizationName, &projectName, &seconds); err != nil {
				panic(err)
			}

			if projectName == "" {
				projectName = "default"
			}

			Logger.Printf("date: %s, organization: %s, project: %s, seconds: %d\n", date, organizationName, projectName, seconds)

			// Find or create the organization
			var organization Organization
			tx.Where(Organization{Name: organizationName}).FirstOrCreate(&organization)

			// Find or create the project
			var project Project
			tx.Where(Project{Name: projectName, OrganizationID: organization.ID}).FirstOrCreate(&project)

			// Create the work hours entry
			workHours := NewWorkHours{
				Date:      date,
				ProjectID: project.ID,
				Seconds:   seconds,
			}
			if err := tx.Create(&workHours).Error; err != nil {
				panic(err)
			}
		}

		// Delete old table
		err = tx.Migrator().DropTable("work_hours")
		if err != nil {
			panic(err)
		}

		// Rename new table to old table name
		err = tx.Migrator().RenameTable("new_work_hours", "work_hours")
		if err != nil {
			panic(err)
		}

		// Commit the transaction
		if err := tx.Commit().Error; err != nil {
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

type MonthlyTotals struct {
	DailyTotals   map[string]map[string]int
	WeeklyTotals  map[int]map[string]int
	ProjectTotals []ProjectTotal
	MonthlyTotal  int
	Dates         []string
	DateSumTotals map[string]int
	WeekSumTotals map[int]int
}

func (a *App) GetWeekOfMonth(year int, month time.Month, day int) int {
	t := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	firstOfMonth := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	currDay := firstOfMonth
	week := 1
	for currDay.Before(t) {
		if currDay.Weekday() == time.Sunday {
			week++
		}
		currDay = currDay.AddDate(0, 0, 1)
	}
	return week
}

func secondsToHours(seconds int) float64 {
	hours := float64(seconds) / 3600
	return math.Round(hours*100) / 100
}

func getWeekRanges(year int, month time.Month) map[int]string {
	weekRanges := make(map[int]string)
	firstOfMonth := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	lastOfMonth := firstOfMonth.AddDate(0, 1, -1)
	currDay := firstOfMonth
	for week := 1; week <= 5; week++ {
		startOfWeekStr := currDay.Format("01-02")
		for currDay.Weekday() != time.Sunday && currDay.Before(lastOfMonth) {
			currDay = currDay.AddDate(0, 0, 1)
		}

		weekRanges[week] = fmt.Sprintf("%s - %s", startOfWeekStr, currDay.Format("01-02"))
		currDay = currDay.AddDate(0, 0, 1)
	}
	return weekRanges
}

func (a *App) getMonthlyTotals(organizationName string, year int, month time.Month) (MonthlyTotals, error) {
	// Find the organization
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		Logger.Println(err)
		return MonthlyTotals{}, err
	}

	rows, err := a.db.Table("work_hours").
		Select("date, projects.name, seconds").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
		Order("date").
		Rows()
	if err != nil {
		return MonthlyTotals{}, err
	}
	defer rows.Close()

	var dates []string
	// Initialize variables to store the daily and weekly totals
	dailyTotals := make(map[string]map[string]int) // map[date]map[project]seconds
	dateSumTotals := make(map[string]int)          // map[date]seconds
	weeklyTotals := make(map[int]map[string]int)   // map[week]map[project]seconds
	weekSumTotals := make(map[int]int)             // map[week]seconds
	monthlyTotals := make(map[string]int)          // map[project]seconds
	monthlyTotal := 0

	// Iterate over the rows and calculate the daily, weekly, and monthly totals
	for rows.Next() {
		var date string
		var project string
		var seconds int
		if err := rows.Scan(&date, &project, &seconds); err != nil {
			return MonthlyTotals{}, err
		}

		if _, ok := dailyTotals[date]; !ok {
			dates = append(dates, date)
			dailyTotals[date] = make(map[string]int)
		}
		dateSumTotals[date] += seconds
		dailyTotals[date][project] += seconds
		parsedDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			return MonthlyTotals{}, err
		}
		week := a.GetWeekOfMonth(year, month, parsedDate.Day())
		if _, ok := weeklyTotals[week]; !ok {
			weeklyTotals[week] = make(map[string]int)
		}
		weekSumTotals[week] += seconds
		weeklyTotals[week][project] += seconds
		if _, ok := monthlyTotals[project]; !ok {
			monthlyTotals[project] = 0
		}
		monthlyTotals[project] += seconds
		monthlyTotal += seconds
	}

	if err := rows.Err(); err != nil {
		return MonthlyTotals{}, err
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
	return MonthlyTotals{
		DailyTotals:   dailyTotals,
		WeeklyTotals:  weeklyTotals,
		ProjectTotals: projectTotals,
		MonthlyTotal:  monthlyTotal,
		Dates:         dates,
		DateSumTotals: dateSumTotals,
		WeekSumTotals: weekSumTotals,
	}, nil
}

type YearlyTotals struct {
	MonthlyTotals  map[string]map[string]int
	MonthSumTotals map[string]int
	ProjectTotals  []ProjectTotal
	YearlyTotal    int
}

func (a *App) getYearlyTotals(organizationName string, year int) (YearlyTotals, error) {
	// Find the organization
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		Logger.Println(err)
		return YearlyTotals{}, err
	}

	rows, err := a.db.Table("work_hours").
		Select("date, projects.name, seconds").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d", year), organization.ID).
		Order("date").
		Rows()
	if err != nil {
		return YearlyTotals{}, err
	}
	defer rows.Close()

	// Initialize variables to store the monthly totals
	monthlyTotals := make(map[string]map[string]int) // map[month]map[project]seconds
	monthSumTotals := make(map[string]int)           // map[month]seconds
	yearlyTotals := make(map[string]int)             // map[project]seconds
	yearlyTotal := 0

	// Iterate over the rows and calculate the monthly and yearly totals
	for rows.Next() {
		var date string
		var project string
		var seconds int
		if err := rows.Scan(&date, &project, &seconds); err != nil {
			return YearlyTotals{}, err
		}

		parsedDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			return YearlyTotals{}, err
		}
		month := int(parsedDate.Month())
		if _, ok := monthlyTotals[monthMap[month]]; !ok {
			monthlyTotals[monthMap[month]] = make(map[string]int)
		}
		monthlyTotals[monthMap[month]][project] += seconds
		monthSumTotals[monthMap[month]] += seconds
		if _, ok := yearlyTotals[project]; !ok {
			yearlyTotals[project] = 0
		}
		yearlyTotals[project] += seconds
		yearlyTotal += seconds
	}

	if err := rows.Err(); err != nil {
		return YearlyTotals{}, err
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
	return YearlyTotals{
		MonthlyTotals:  monthlyTotals,
		MonthSumTotals: monthSumTotals,
		ProjectTotals:  projectTotals,
		YearlyTotal:    yearlyTotal,
	}, nil
}

func (a *App) ExportByMonth(exportType ExportType, organization string, year int, month time.Month) (string, error) {
	Logger.Println("Exporting by month...", exportType, organization, year, month)
	if exportType == CSV {
		return a.exportCSVByMonth(organization, year, month)
	} else if exportType == PDF {
		return a.exportPDFByMonth(organization, year, month)
	} else {
		return "", fmt.Errorf("invalid export type")
	}
}

func (a *App) ExportByYear(exportType ExportType, organization string, year int) (string, error) {
	Logger.Println("Exporting by year...", exportType, organization, year)
	if exportType == CSV {
		return a.exportCSVByYear(organization, year)
	} else if exportType == PDF {
		return a.exportPDFByYear(organization, year)
	} else {
		return "", fmt.Errorf("invalid export type")
	}
}
