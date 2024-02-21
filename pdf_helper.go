package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/jung-kurt/gofpdf"
)

func (a *App) ExportPDFByMonth(organization string, year int, month time.Month) string {
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
	dir := filepath.Join(dbDir, "pdf", organization, strconv.Itoa(year), month.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
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
	pdf.CellFormat(40, 10, "Seconds", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write monthly total
	pdf.CellFormat(40, 10, month.String(), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, strconv.Itoa(monthlyTotal), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, formatTime(monthlyTotal), "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Add space between tables
	pdf.Ln(-1)

	// Write table header for weekly breakdown
	pdf.CellFormat(40, 10, "Week", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Seconds", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write weekly totals
	for week, seconds := range weeklyTotals {
		pdf.CellFormat(40, 10, strconv.Itoa(week), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, strconv.Itoa(seconds), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(seconds), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
	}

	// Add space between tables
	pdf.Ln(-1)

	// Write table header for daily breakdown
	pdf.CellFormat(40, 10, "Date", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Seconds", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write daily totals
	for _, date := range dates {
		seconds := dailyTotals[date]
		pdf.CellFormat(40, 10, date, "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, strconv.Itoa(seconds), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(seconds), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
	}

	// Save the PDF
	pdfFilePath := filepath.Join(dir, "work_hours.pdf")
	err = pdf.OutputFileAndClose(pdfFilePath)
	if err != nil {
		panic(err)
	}
	runtime.BrowserOpenURL(a.ctx, pdfFilePath)
	return pdfFilePath
}

func (a *App) ExportPDFByYear(organization string, year int) string {
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
	dir := filepath.Join(dbDir, "pdf", organization, strconv.Itoa(year))
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
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
	pdf.CellFormat(40, 10, "Seconds", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write monthly total
	pdf.CellFormat(40, 10, strconv.Itoa(year), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, strconv.Itoa(yearlyTotal), "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, formatTime(yearlyTotal), "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Add space between tables
	pdf.Ln(-1)

	// Write table header for monthly breakdown
	pdf.CellFormat(40, 10, "Month", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Seconds", "1", 0, "", false, 0, "")
	pdf.CellFormat(40, 10, "Time (HH:MM:SS)", "1", 0, "", false, 0, "")
	pdf.Ln(-1)

	// Write weekly totals
	for index, seconds := range monthlyTotals {
		monthName := monthMap[index]
		pdf.CellFormat(40, 10, monthName, "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, strconv.Itoa(seconds), "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, formatTime(seconds), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
	}

	// Save the PDF
	pdfFilePath := filepath.Join(dir, "work_hours_yearly.pdf")
	err = pdf.OutputFileAndClose(pdfFilePath)
	if err != nil {
		panic(err)
	}
	runtime.BrowserOpenURL(a.ctx, pdfFilePath)
	return pdfFilePath
}
