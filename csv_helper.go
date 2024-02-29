package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ProjectTotal struct {
	Name    string
	Seconds int
}

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

func (a *App) getMonthlyTotals(organization string, year int, month time.Month) (map[string]map[string]int, map[int]map[string]int, []ProjectTotal, int, []string) {
	fmt.Println("getMonthlyTotals", organization, year, month)
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
		log.Println(date, project, seconds)

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

func (a *App) ExportCSVByMonth(organization string, year int, month time.Month) (string, error) {
	dailyTotals, weeklyTotals, monthlyTotals, monthlyTotal, dates := a.getMonthlyTotals(organization, year, month)

	// Get the save directory
	dbDir, err := getSaveDir(a.environment)
	if err != nil {
		log.Println(err)
		return "", err
	}

	// Create the directories for the organization, year, and month
	dir := filepath.Join(dbDir, "csv", organization, strconv.Itoa(year), month.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		// panic(err)
		log.Println(err)
		return "", err
	}

	// Create the CSV file
	csvFilePath := filepath.Join(dir, "work_hours.csv")
	csvFile, err := os.Create(csvFilePath)
	if err != nil {
		log.Println(err)
		return "", err
	}
	defer csvFile.Close()

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write the monthly total to the CSV file
	writer.Write([]string{"Month total for " + organization})
	writer.Write([]string{"Month", "Seconds", "Time (HH:MM:SS)"})
	time := formatTime(monthlyTotal)
	writer.Write([]string{month.String(), strconv.Itoa(monthlyTotal), time})

	// Write the monthly totals per project to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Monthly breakdown"})
	writer.Write([]string{"Project", "Seconds", "Time (HH:MM:SS)"})
	for _, projectTotal := range monthlyTotals {
		time := formatTime(projectTotal.Seconds)
		writer.Write([]string{projectTotal.Name, strconv.Itoa(projectTotal.Seconds), time})
	}

	// Write the weekly totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Weekly breakdown"})
	writer.Write([]string{"Week", "Seconds", "Time (HH:MM:SS)"})
	for week, projectTotals := range weeklyTotals {
		for project, seconds := range projectTotals {
			time := formatTime(seconds)
			writer.Write([]string{strconv.Itoa(week), project, strconv.Itoa(seconds), time})
		}
	}

	// Write the daily totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Daily breakdown"})
	writer.Write([]string{"Date", "Seconds", "Time (HH:MM:SS)"})
	for _, date := range dates {
		for project, seconds := range dailyTotals[date] {
			time := formatTime(seconds)
			writer.Write([]string{date, project, strconv.Itoa(seconds), time})
		}
	}
	runtime.ClipboardSetText(a.ctx, csvFilePath)
	return csvFilePath, nil
}

func (a *App) ExportCSVByYear(organization string, year int) (string, error) {
	monthlyTotals, yearlyTotals, yearlyTotal := a.getYearlyTotals(organization, year)

	// Get the save directory
	dbDir, err := getSaveDir(a.environment)
	if err != nil {
		log.Println(err)
		return "", err
	}

	// Create the directories for the organization and year
	dir := filepath.Join(dbDir, "csv", organization, strconv.Itoa(year))
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Println(err)
		return "", err
	}

	// Create the CSV file
	csvFilePath := filepath.Join(dir, "work_hours_yearly.csv")
	csvFile, err := os.Create(csvFilePath)
	if err != nil {
		log.Println(err)
		return "", err
	}
	defer csvFile.Close()

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write the yearly total to the CSV file
	writer.Write([]string{"Yearly total for " + organization})
	writer.Write([]string{"Year", "Seconds", "Time (HH:MM:SS)"})
	time := formatTime(yearlyTotal)
	writer.Write([]string{strconv.Itoa(year), strconv.Itoa(yearlyTotal), time})

	// Write the yearly totals per project to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Yearly breakdown"})
	writer.Write([]string{"Project", "Seconds", "Time (HH:MM:SS)"})
	for _, yearlyTotal := range yearlyTotals {
		time := formatTime(yearlyTotal.Seconds)
		writer.Write([]string{yearlyTotal.Name, strconv.Itoa(yearlyTotal.Seconds), time})
	}

	// Write the monthly totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Monthly breakdown"})
	writer.Write([]string{"Month", "Seconds", "Time (HH:MM:SS)"})
	for month, projectTotals := range monthlyTotals {
		for project, seconds := range projectTotals {
			time := formatTime(seconds)
			writer.Write([]string{month, project, strconv.Itoa(seconds), time})
		}
	}
	runtime.ClipboardSetText(a.ctx, csvFilePath)
	return csvFilePath, nil
}

func formatTime(seconds int) string {
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	seconds %= 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}
