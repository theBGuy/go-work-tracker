package main

import (
	"encoding/csv"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) exportCSVByMonth(organization string, year int, month time.Month) (string, error) {
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

func (a *App) exportCSVByYear(organization string, year int) (string, error) {
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
