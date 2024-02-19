package main

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"
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

func (a *App) ExportCSVByMonth(organization string, year int, month time.Month) string {
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

	// Get the save directory
	dbDir, err := getSaveDir(a.environment)
	if err != nil {
		panic(err)
	}

	// Create the directories for the organization, year, and month
	dir := filepath.Join(dbDir, "csv", organization, strconv.Itoa(year), month.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}

	// Create the CSV file
	csvFilePath := filepath.Join(dir, "work_hours.csv")
	csvFile, err := os.Create(csvFilePath)
	if err != nil {
		panic(err)
	}
	defer csvFile.Close()

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write the monthly total to the CSV file
	writer.Write([]string{"Month total for " + organization})
	writer.Write([]string{"Month", "Seconds", "Time (HH:MM:SS)"})
	time := formatTime(monthlyTotal)
	writer.Write([]string{month.String(), strconv.Itoa(monthlyTotal), time})

	// Write the weekly totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Weekly breakdown"})
	writer.Write([]string{"Week", "Seconds", "Time (HH:MM:SS)"})
	for week, seconds := range weeklyTotals {
		time := formatTime(seconds)
		writer.Write([]string{strconv.Itoa(week), strconv.Itoa(seconds), time})
	}

	// Write the daily totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Daily breakdown"})
	writer.Write([]string{"Date", "Seconds", "Time (HH:MM:SS)"})
	for _, date := range dates {
		seconds := dailyTotals[date]
		time := formatTime(seconds)
		writer.Write([]string{date, strconv.Itoa(seconds), time})
	}
	return csvFilePath
}

func (a *App) ExportCSVByYear(organization string, year int) string {
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

	// Get the save directory
	dbDir, err := getSaveDir(a.environment)
	if err != nil {
		panic(err)
	}

	// Create the directories for the organization and year
	dir := filepath.Join(dbDir, "csv", organization, strconv.Itoa(year))
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}

	// Create the CSV file
	csvFilePath := filepath.Join(dir, "work_hours_yearly.csv")
	csvFile, err := os.Create(csvFilePath)
	if err != nil {
		panic(err)
	}
	defer csvFile.Close()

	writer := csv.NewWriter(csvFile)
	defer writer.Flush()

	// Write the yearly total to the CSV file
	writer.Write([]string{"Yearly total for " + organization})
	writer.Write([]string{"Year", "Seconds", "Time (HH:MM:SS)"})
	time := formatTime(yearlyTotal)
	writer.Write([]string{strconv.Itoa(year), strconv.Itoa(yearlyTotal), time})

	// Write the monthly totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Monthly breakdown"})
	writer.Write([]string{"Month", "Seconds", "Time (HH:MM:SS)"})
	for index, seconds := range monthlyTotals {
		time := formatTime(seconds)
		monthName := monthMap[index]
		writer.Write([]string{monthName, strconv.Itoa(seconds), time})
	}
	return csvFilePath
}

func formatTime(seconds int) string {
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	seconds %= 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}
