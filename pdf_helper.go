package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/jung-kurt/gofpdf"
)

func (a *App) exportPDFByMonth(organization string, year int, month time.Month) (string, error) {
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
	dir := filepath.Join(dbDir, "pdf", organization, strconv.Itoa(year), month.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Println(err)
		return "", err
	}

	// Create a new PDF
	pdf := gofpdf.New("P", "mm", "A4", "")

	// Add a page
	pdf.AddPage()

	// Set font
	pdf.SetFont("Arial", "B", 16)

	// pdf.SetFillColor(240, 240, 240)

	// Write title
	pdf.Cell(40, 10, fmt.Sprintf("Work Hours for %s", organization))
	pdf.Ln(-1)

	// Set font for table
	pdf.SetFont("Arial", "", 12)

	// Write title
	pdf.Cell(40, 10, fmt.Sprintf("Month total for organization %s", organization))
	pdf.Ln(-1)

	// Write table header for monthly total
	pdf.CellFormat(40, 10, "Month", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write monthly total
	monthlyHours := secondsToHours(MonthlyTotals.MonthlyTotal)
	pdf.CellFormat(40, 10, month.String(), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", monthlyHours), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, formatTime(MonthlyTotals.MonthlyTotal), "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Add space between tables
	pdf.Ln(-1)

	// find the project with the longest name to set the width of the project column
	var longestProjectName string
	for _, projectTotal := range MonthlyTotals.ProjectTotals {
		if len(projectTotal.Name) > len(longestProjectName) {
			longestProjectName = projectTotal.Name
		}
	}

	width := 40.0
	if pdf.GetStringWidth(longestProjectName) > 40 {
		width = pdf.GetStringWidth(longestProjectName) + 5
	}

	// Write table header for monthly per project breakdown
	pdf.Cell(40, 10, "Monthly breakdown")
	pdf.Ln(-1)
	pdf.CellFormat(width, 10, "Project", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write monthly totals per project
	for _, projectTotal := range MonthlyTotals.ProjectTotals {
		if projectTotal.Seconds == 0 {
			continue
		}

		projectHours := secondsToHours(projectTotal.Seconds)
		pdf.CellFormat(width, 10, projectTotal.Name, "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", projectHours), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(projectTotal.Seconds), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
	}

	// Add space between tables
	pdf.Ln(-1)

	// Write table header for weekly breakdown
	pdf.Cell(40, 10, "Weekly breakdown")
	pdf.Ln(-1)
	pdf.CellFormat(40, 10, "Week", "1", 0, "", false, 0, "")
	pdf.CellFormat(width, 10, "Project", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	weekRanges := getWeekRanges(year, month)

	// Write weekly totals
	for week := 0; week <= 4; week++ {
		projectTotals, ok := MonthlyTotals.WeeklyTotals[week]
		if !ok {
			continue
		}
		// check that at least one project has time logged
		var logWeek bool
		for _, seconds := range projectTotals {
			if seconds > 0 {
				logWeek = true
				break
			}
		}
		if !logWeek {
			continue
		}

		weekSumHours := secondsToHours(MonthlyTotals.WeekSumTotals[week])
		pdf.CellFormat(40, 10, fmt.Sprintf("(%s)", weekRanges[week]), "1", 0, "", false, 0, "")
		pdf.CellFormat(width, 10, "TOTAL", "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", weekSumHours), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(MonthlyTotals.WeekSumTotals[week]), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
		for project, seconds := range projectTotals {
			if seconds == 0 {
				continue
			}
			projectHours := secondsToHours(seconds)
			pdf.CellFormat(40, 10, "", "1", 0, "", false, 0, "")
			pdf.CellFormat(width, 10, project, "1", 0, "", false, 0, "")
			pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", projectHours), "1", 0, "", false, 0, "")
			pdf.CellFormat(40, 10, formatTime(seconds), "1", 0, "", false, 0, "")
			pdf.Ln(-1)
		}
	}

	// Add space between tables
	pdf.Ln(-1)

	// Write table header for daily breakdown
	pdf.Cell(40, 10, "Daily breakdown")
	pdf.Ln(-1)
	pdf.CellFormat(40, 10, "Date", "1", 0, "", false, 0, "")
	pdf.CellFormat(width, 10, "Project", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write daily totals
	for _, date := range MonthlyTotals.Dates {
		// check that at least one project has time logged
		var logDate bool
		for _, seconds := range MonthlyTotals.DailyTotals[date] {
			if seconds > 0 {
				logDate = true
				break
			}
		}
		if !logDate {
			continue
		}

		dateHours := secondsToHours(MonthlyTotals.DateSumTotals[date])
		pdf.CellFormat(40, 10, date, "1", 0, "", false, 0, "")
		pdf.CellFormat(width, 10, "TOTAL", "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", dateHours), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(MonthlyTotals.DateSumTotals[date]), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
		for project, seconds := range MonthlyTotals.DailyTotals[date] {
			if seconds == 0 {
				continue
			}
			projectHours := secondsToHours(seconds)
			pdf.CellFormat(40, 10, "", "1", 0, "", false, 0, "")
			pdf.CellFormat(width, 10, project, "1", 0, "", false, 0, "")
			pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", projectHours), "1", 0, "", false, 0, "")
			pdf.CellFormat(40, 10, formatTime(seconds), "1", 0, "", false, 0, "")
			pdf.Ln(-1)
		}
	}

	// Save the PDF
	dateStr := fmt.Sprintf("%d-%s", year, month.String())
	pdfFileName := fmt.Sprintf("work_hours_%s.pdf", dateStr)
	pdfFilePath := filepath.Join(dir, pdfFileName)
	err = pdf.OutputFileAndClose(pdfFilePath)
	if err != nil {
		log.Println(err)
		return "", err
	}
	runtime.BrowserOpenURL(a.ctx, pdfFilePath)
	return pdfFilePath, nil
}

func (a *App) exportPDFByYear(organization string, year int) (string, error) {
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
	dir := filepath.Join(dbDir, "pdf", organization, strconv.Itoa(year))
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Println(err)
		return "", err
	}

	// Create a new PDF
	pdf := gofpdf.New("P", "mm", "A4", "")

	// Add a page
	pdf.AddPage()

	// Set font
	pdf.SetFont("Arial", "B", 16)

	// Write title
	pdf.Cell(40, 10, fmt.Sprintf("Work Hours for %s", organization))
	pdf.Ln(-1)

	// Set font for table
	pdf.SetFont("Arial", "", 12)

	// Write title
	pdf.Cell(40, 10, fmt.Sprintf("Yearly total for organization %s", organization))
	pdf.Ln(-1)

	// Write table header for monthly total
	pdf.CellFormat(40, 10, "Year", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write yearly total
	yearlyHours := secondsToHours(YearlyTotals.YearlyTotal)
	pdf.CellFormat(40, 10, strconv.Itoa(year), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", yearlyHours), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, formatTime(YearlyTotals.YearlyTotal), "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Add space between tables
	pdf.Ln(-1)

	// find the project with the longest name to set the width of the project column
	var longestProjectName string
	for _, projectTotal := range YearlyTotals.ProjectTotals {
		if len(projectTotal.Name) > len(longestProjectName) {
			longestProjectName = projectTotal.Name
		}
	}

	width := 40.0
	if pdf.GetStringWidth(longestProjectName) > 40 {
		width = pdf.GetStringWidth(longestProjectName) + 5
	}

	// Write table for yearly per project breakdown
	pdf.Cell(40, 10, "Yearly breakdown")
	pdf.Ln(-1)
	pdf.CellFormat(width, 10, "Project", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)
	for _, yearlyTotal := range YearlyTotals.ProjectTotals {
		if yearlyTotal.Seconds == 0 {
			continue
		}

		projectHours := secondsToHours(yearlyTotal.Seconds)
		pdf.CellFormat(width, 10, yearlyTotal.Name, "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", projectHours), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(yearlyTotal.Seconds), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
	}

	// Add space between tables
	pdf.Ln(-1)

	// Write table header for monthly breakdown
	pdf.Cell(40, 10, "Monthly breakdown")
	pdf.Ln(-1)
	pdf.CellFormat(40, 10, "Month", "1", 0, "", false, 0, "")
	pdf.CellFormat(width, 10, "Project", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Hours", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write monthly totals
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

		monthlyHours := secondsToHours(YearlyTotals.MonthSumTotals[month])
		pdf.CellFormat(40, 10, month, "1", 0, "", false, 0, "")
		pdf.CellFormat(width, 10, "TOTAL", "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", monthlyHours), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(YearlyTotals.MonthSumTotals[month]), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
		for project, seconds := range projectTotals {
			if seconds == 0 {
				continue
			}

			projectHours := secondsToHours(seconds)
			pdf.CellFormat(40, 10, "", "1", 0, "", false, 0, "")
			pdf.CellFormat(width, 10, project, "1", 0, "", false, 0, "")
			pdf.CellFormat(40, 10, fmt.Sprintf("%.2f", projectHours), "1", 0, "", false, 0, "")
			pdf.CellFormat(40, 10, formatTime(seconds), "1", 0, "", false, 0, "")
			pdf.Ln(-1)
		}
	}

	// Save the PDF
	pdfFileName := fmt.Sprintf("work_hours_%d.pdf", year)
	pdfFilePath := filepath.Join(dir, pdfFileName)
	err = pdf.OutputFileAndClose(pdfFilePath)
	if err != nil {
		log.Println(err)
		return "", err
	}
	runtime.BrowserOpenURL(a.ctx, pdfFilePath)
	return pdfFilePath, nil
}
