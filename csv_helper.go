package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) exportCSVByMonth(organization string, year int, month time.Month) (string, error) {
	MonthlyTotals, err := a.getMonthlyTotals(organization, year, month)
	if err != nil {
		log.Println(err)
		return "", err
	}

	// Get the save directory
	dbDir, err := getSaveDir(a.environment)
	if err != nil {
		log.Println(err)
		return "", err
	}

	// Create the directories for the organization, year, and month
	dir := filepath.Join(dbDir, "csv", organization, strconv.Itoa(year), month.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Println(err)
		return "", err
	}

	// Create the CSV file
	dateStr := fmt.Sprintf("%d-%s", year, month.String())
	csvFileName := fmt.Sprintf("work_hours_%s.csv", dateStr)
	csvFilePath := filepath.Join(dir, csvFileName)
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
	writer.Write([]string{"Month", "Hours", "Time (HH:MM:SS)"})
	timeStr := formatTime(MonthlyTotals.MonthlyTotal)
	monthlyHours := secondsToHours(MonthlyTotals.MonthlyTotal)
	writer.Write([]string{month.String(), fmt.Sprintf("%.2f", monthlyHours), timeStr})

	// Write the monthly totals per project to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Monthly breakdown"})
	writer.Write([]string{"Project", "Hours", "Time (HH:MM:SS)"})
	for _, projectTotal := range MonthlyTotals.ProjectTotals {
		timeStr := formatTime(projectTotal.Seconds)
		projectHours := secondsToHours(projectTotal.Seconds)
		writer.Write([]string{projectTotal.Name, fmt.Sprintf("%.2f", projectHours), timeStr})
	}

	// Write the weekly totals to the CSV file
	weekRanges := getWeekRanges(year, month)
	writer.Write([]string{})
	writer.Write([]string{"Weekly breakdown"})
	writer.Write([]string{"Week", "Project", "Hours", "Time (HH:MM:SS)"})
	for week := 0; week <= 4; week++ {
		projectTotals, ok := MonthlyTotals.WeeklyTotals[week]
		if !ok {
			continue
		}
		for project, seconds := range projectTotals {
			timeStr := formatTime(seconds)
			projectHours := secondsToHours(seconds)
			writer.Write([]string{fmt.Sprintf("(%s)", weekRanges[week]), project, fmt.Sprintf("%.2f", projectHours), timeStr})
		}
	}

	// Write the daily totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Daily breakdown"})
	writer.Write([]string{"Date", "Project", "Hours", "Time (HH:MM:SS)"})
	for _, date := range MonthlyTotals.Dates {
		for project, seconds := range MonthlyTotals.DailyTotals[date] {
			timeStr := formatTime(seconds)
			projectHours := secondsToHours(seconds)
			writer.Write([]string{date, project, fmt.Sprintf("%.2f", projectHours), timeStr})
		}
	}
	runtime.ClipboardSetText(a.ctx, csvFilePath)
	return csvFilePath, nil
}

func (a *App) exportCSVByYear(organization string, year int) (string, error) {
	YearlyTotals, err := a.getYearlyTotals(organization, year)
	if err != nil {
		log.Println(err)
		return "", err
	}

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
	csvFileName := fmt.Sprintf("work_hours_%d.csv", year)
	csvFilePath := filepath.Join(dir, csvFileName)
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
	writer.Write([]string{"Year", "Hours", "Time (HH:MM:SS)"})
	timeStr := formatTime(YearlyTotals.YearlyTotal)
	yearlyHours := secondsToHours(YearlyTotals.YearlyTotal)
	writer.Write([]string{strconv.Itoa(year), fmt.Sprintf("%.2f", yearlyHours), timeStr})

	// Write the yearly totals per project to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Yearly breakdown"})
	writer.Write([]string{"Project", "Hours", "Time (HH:MM:SS)"})
	for _, yearlyTotal := range YearlyTotals.ProjectTotals {
		timeStr := formatTime(yearlyTotal.Seconds)
		projectHours := secondsToHours(yearlyTotal.Seconds)
		writer.Write([]string{yearlyTotal.Name, fmt.Sprintf("%.2f", projectHours), timeStr})
	}

	// Write the monthly totals to the CSV file
	writer.Write([]string{})
	writer.Write([]string{"Monthly breakdown"})
	writer.Write([]string{"Month", "Project", "Hours", "Time (HH:MM:SS)"})
	for mIdx := time.January; mIdx <= time.December; mIdx++ {
		month := monthMap[int(mIdx)]
		if _, ok := YearlyTotals.MonthlyTotals[month]; !ok {
			continue
		}
		projectTotals := YearlyTotals.MonthlyTotals[month]

		// check that at least one project has time logged
		var logMonth bool
		for _, seconds := range projectTotals {
			if seconds > 0 {
				logMonth = true
				break
			}
		}
		if !logMonth {
			continue
		}
		for project, seconds := range projectTotals {
			timeStr := formatTime(seconds)
			projectHours := secondsToHours(seconds)
			writer.Write([]string{month, project, fmt.Sprintf("%.2f", projectHours), timeStr})
		}
	}
	runtime.ClipboardSetText(a.ctx, csvFilePath)
	return csvFilePath, nil
}
