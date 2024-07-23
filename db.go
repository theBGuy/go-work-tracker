package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Organization struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	Name      string         `json:"name"`
	Favorite  bool           `json:"favorite"`
	Projects  []Project      `json:"projects"`
}

type Project struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	Name           string         `json:"name"`
	OrganizationID uint           `json:"organization_id"`
	Favorite       bool           `json:"favorite"`
	WorkHours      []WorkHours    `json:"work_hours"`
}

type WorkHours struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	Date      string         `json:"date"`
	Seconds   int            `json:"seconds"`
	ProjectID uint           `json:"project_id"`
}

var (
	Logger = log.New(os.Stdout, "", log.LstdFlags|log.Lshortfile)
)

func handleDBError(err error) {
	if err != nil {
		panic(err)
	}
}

func NewDb(dbDir string) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(filepath.Join(dbDir, "worktracker.sqlite")), &gorm.Config{})
	handleDBError(err)

	fixOutdatedDb(db)

	err = db.AutoMigrate(&WorkHours{}, &Project{}, &Organization{})
	handleDBError(err)

	return db
}

func (a *App) getOrganization(organizationName string) (Organization, error) {
	var organization Organization

	err := a.db.
		Where("organizations.deleted_at IS NULL"). // Ignore deleted organizations
		Where(&Organization{Name: organizationName}).
		First(&organization).Error

	if err != nil {
		Logger.Println(err)
		return Organization{}, err
	}
	return organization, nil
}

func (a *App) getProject(organizationID uint, projectName string) (Project, error) {
	var project Project
	err := a.db.
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("name = ? AND organization_id = ?", projectName, organizationID).
		First(&project).Error
	if err != nil {
		Logger.Println(err)
		return Project{}, err
	}
	return project, nil
}

func (a *App) NewOrganization(organizationName string, projectName string) {
	if organizationName == "" || projectName == "" {
		return
	}

	// Check if organization exists, if not create it
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			organization = Organization{Name: organizationName}
			if err := a.db.Create(&organization).Error; err != nil {
				handleDBError(err)
				return
			}
		} else {
			handleDBError(err)
			return
		}
	}

	// Check if project exists within the organization, if not create it
	var project Project
	if err := a.db.Where("name = ? AND organization_id = ?", projectName, organization.ID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			project = Project{Name: projectName, OrganizationID: organization.ID}
			if err := a.db.Create(&project).Error; err != nil {
				handleDBError(err)
				return
			}
		} else {
			handleDBError(err)
			return
		}
	}

	// Create a new WorkHours entry for the project
	currentDate := time.Now().Format("2006-01-02")
	workHours := WorkHours{
		Date:      currentDate,
		ProjectID: project.ID,
		Seconds:   0,
	}
	if err := a.db.Create(&workHours).Error; err != nil {
		handleDBError(err)
	}
}

func (a *App) SetOrganization(organizationName string, projectName string) {
	if a.isRunning {
		a.StopTimer(a.organization, a.project)
	}

	// Check if the organization exists
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No entry for the given organization
			a.NewOrganization(organizationName, projectName)
		} else {
			handleDBError(err)
			return
		}
	}

	// Check if the project exists within the organization
	var project Project
	if err := a.db.Where(&Project{Name: projectName, OrganizationID: organization.ID}).First(&project).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No entry for the given project within the organization
			a.NewOrganization(organizationName, projectName)
		} else {
			handleDBError(err)
			return
		}
	}

	a.organization = organizationName
	a.project = projectName
}

func (a *App) RenameOrganization(oldName string, newName string) {
	if newName == "" {
		return
	}

	organization, err := a.getOrganization(oldName)
	if err != nil {
		handleDBError(err)
	}

	// Update the organization's name
	organization.Name = newName
	if err := a.db.Save(&organization).Error; err != nil {
		handleDBError(err)
	}
}

func (a *App) ToggleFavoriteOrganization(organizationName string) {
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		handleDBError(err)
	}

	organization.Favorite = !organization.Favorite
	if err := a.db.Save(&organization).Error; err != nil {
		handleDBError(err)
	}
}

// Create a new project for the specified organization
func (a *App) NewProject(organizationName string, projectName string) {
	if projectName == "" || organizationName == "" {
		return
	}

	// Check if the organization exists, if not create it
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			organization = Organization{Name: organizationName}
			if err := a.db.Create(&organization).Error; err != nil {
				handleDBError(err)
				return
			}
		} else {
			handleDBError(err)
			return
		}
	}

	// Check if the project exists within the organization, if not create it
	var project Project
	if err := a.db.Where(&Project{Name: projectName, OrganizationID: organization.ID}).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			project = Project{Name: projectName, OrganizationID: organization.ID}
			if err := a.db.Create(&project).Error; err != nil {
				handleDBError(err)
			}
		} else {
			handleDBError(err)
		}
	}

	// Create a new WorkHours entry for the project
	currentDate := time.Now().Format("2006-01-02")
	workHours := WorkHours{
		Date:      currentDate,
		ProjectID: project.ID,
		Seconds:   0,
	}
	if err := a.db.Create(&workHours).Error; err != nil {
		handleDBError(err)
	}
}

func (a *App) RenameProject(organizationName string, oldName string, newName string) {
	if newName == "" || organizationName == "" {
		return
	}
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		handleDBError(err)
	}

	// Find the project within the organization
	var project Project
	if err := a.db.Where(&Project{Name: oldName, OrganizationID: organization.ID}).First(&project).Error; err != nil {
		handleDBError(err)
	}

	// Update the project's name
	project.Name = newName
	if err := a.db.Save(&project).Error; err != nil {
		handleDBError(err)
	}
}

func (a *App) DeleteProject(organizationName string, projectName string) {
	if projectName == "" || organizationName == "" {
		return
	}

	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		handleDBError(err)
	}

	// Find the project within the organization
	var project Project
	if err := a.db.Where(&Project{Name: projectName, OrganizationID: organization.ID}).First(&project).Error; err != nil {
		handleDBError(err)
	}

	// Delete the project's WorkHours entries
	if err := a.db.Where(&WorkHours{ProjectID: project.ID}).Delete(&WorkHours{}).Error; err != nil {
		handleDBError(err)
	}

	// Delete the project
	if err := a.db.Delete(&project).Error; err != nil {
		handleDBError(err)
	}
}

func (a *App) ToggleFavoriteProject(organizationName string, projectName string) {
	if projectName == "" || organizationName == "" {
		return
	}

	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		handleDBError(err)
	}

	// Find the project within the organization
	project, err := a.getProject(organization.ID, projectName)
	if err != nil {
		handleDBError(err)
	}

	project.Favorite = !project.Favorite
	if err := a.db.Save(&project).Error; err != nil {
		handleDBError(err)
	}
}

// GetProjects returns the list of projects for the specified organization
func (a *App) GetProjects(organizationName string) (projects []Project, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return nil, err
	}

	// Get the projects within the organization
	err = a.db.
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where(&Project{OrganizationID: organization.ID}).
		Find(&projects).Error
	if err != nil {
		return nil, err
	}

	return projects, nil
}

func (a *App) DeleteOrganization(organizationName string) {
	if organizationName == "" {
		return
	}

	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		handleDBError(err)
	}

	// Delete the organization's projects' WorkHours entries
	var projectIDs []int
	err = a.db.Model(&Project{}).
		Where("organization_id = ?", organization.ID).
		Pluck("id", &projectIDs).Error
	if err != nil {
		handleDBError(err)
	}

	err = a.db.Where("project_id IN (?)", projectIDs).Delete(&WorkHours{}).Error
	if err != nil {
		handleDBError(err)
	}

	// Delete the organization's projects
	if err := a.db.Where(&Project{OrganizationID: organization.ID}).Delete(&Project{}).Error; err != nil {
		handleDBError(err)
	}

	// Delete the organization
	if err := a.db.Delete(&organization).Error; err != nil {
		handleDBError(err)
	}
}

func (a *App) GetOrganizations() (organizations []Organization, err error) {
	if err := a.db.Find(&organizations).Where("organizations.deleted_at IS NULL").Error; err != nil {
		return nil, err
	}

	return organizations, nil
}

func (a *App) saveTimer(organizationName string, projectName string) {
	endTime := time.Now()
	secsWorked := 0
	if !a.lastSave.IsZero() {
		// If lastSave is set, calculate the seconds worked since the last save
		secsWorked = int(endTime.Sub(a.lastSave).Seconds())
	} else {
		// If lastSave is not set, calculate the seconds worked since the timer started
		secsWorked = int(endTime.Sub(a.startTime).Seconds())
	}
	date := a.startTime.Format("2006-01-02")

	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		handleDBError(err)
	}

	// Find the project within the organization
	project, err := a.getProject(organization.ID, projectName)
	if err != nil {
		handleDBError(err)
	}

	workHours := WorkHours{
		Date:      date,
		ProjectID: project.ID,
		Seconds:   0,
	}
	err = a.db.FirstOrCreate(&workHours, WorkHours{Date: date, ProjectID: project.ID}).Error
	handleDBError(err)

	err = a.db.Model(&workHours).Update("seconds", gorm.Expr("seconds + ?", secsWorked)).Error
	handleDBError(err)

	a.lastSave = time.Now()
}

// GetWorkTime returns the total seconds worked on the specified date
func (a *App) GetWorkTime(date string, organizationName string) (seconds int, err error) {
	if date == "" || organizationName == "" {
		return 0, nil
	}

	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		Logger.Println(err)
		return 0, err
	}

	// Get the total work time for the organization on the given date
	var totalSeconds int
	err = a.db.Model(&WorkHours{}).
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("work_hours.date = ? AND projects.organization_id = ?", date, organization.ID).
		Select("COALESCE(SUM(seconds), 0)").
		Row().Scan(&totalSeconds)
	if err != nil {
		Logger.Println(err, totalSeconds)
		return 0, nil
	}

	return totalSeconds, nil
}

// GetDailyWorkTime returns the total seconds worked for each day for the specified organization
// func (a *App) GetDailyWorkTime(organizationName string) (dailyWorkTime map[string]int, err error) {
// 	dailyWorkTime = make(map[string]int)
// 	// Find the organization
// 	organization, err := a.getOrganization(organizationName)
// 	if err != nil {
// 		return nil, err
// 	}

// 	rows, err := a.db.Table("work_hours").
// 		Select("date, COALESCE(SUM(seconds), 0)").
// 		Joins("JOIN projects ON projects.id = work_hours.project_id").
// 		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
// 		Where("projects.organization_id = ?", organization.ID).
// 		Group("date").
// 		Rows()
// 	if err != nil {
// 		Logger.Println(err)
// 		return nil, err
// 	}
// 	defer rows.Close()

// 	for rows.Next() {
// 		var date string
// 		var seconds int
// 		if err := rows.Scan(&date, &seconds); err != nil {
// 			Logger.Println(err)
// 			return nil, err
// 		}
// 		dailyWorkTime[date] = seconds
// 	}

// 	if err := rows.Err(); err != nil {
// 		Logger.Println(err)
// 		return nil, err
// 	}

// 	return dailyWorkTime, nil
// }

// GetDailyWorkTimeByMonth returns the total seconds worked for each day for each project of the specified organization for a specific month
func (a *App) GetDailyWorkTimeByMonth(year int, month time.Month, organizationName string) (dailyWorkTime map[string]map[string]int, err error) {
	dailyWorkTime = make(map[string]map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return nil, err
	}

	rows, err := a.db.Table("work_hours").
		Select("date, projects.name, COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
		Group("date, projects.name").
		Rows()
	if err != nil {
		Logger.Println(err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var date string
		var project string
		var seconds int
		if err := rows.Scan(&date, &project, &seconds); err != nil {
			Logger.Println(err)
			return nil, err
		}
		if _, ok := dailyWorkTime[date]; !ok {
			dailyWorkTime[date] = make(map[string]int)
		}
		dailyWorkTime[date][project] = seconds
	}

	if err := rows.Err(); err != nil {
		Logger.Println(err)
		return nil, err
	}

	return dailyWorkTime, nil
}

// GetWorkTimeByProject returns the total seconds worked for the specified project on specific date
func (a *App) GetWorkTimeByProject(organizationName string, projectName string, date string) (seconds int, err error) {
	if projectName == "" || organizationName == "" {
		return 0, nil
	}
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return 0, err
	}

	// Find the project within the organization
	project, err := a.getProject(organization.ID, projectName)
	if err != nil {
		return 0, err
	}

	// Get the work time for the project on the given date
	var totalSeconds int
	err = a.db.Model(&WorkHours{}).
		Where("date = ? AND project_id = ?", date, project.ID).
		Select("COALESCE(SUM(seconds), 0)").
		Row().Scan(&totalSeconds)
	if err != nil {
		Logger.Println(err)
		if err == sql.ErrNoRows {
			// No entry for the given project
			return 0, nil
		}
		return 0, err
	}

	return totalSeconds, nil
}

// GetWeeklyWorkTime returns the total seconds worked for each week of the specified month
func (a *App) GetWeeklyWorkTime(year int, month time.Month, organizationName string) (weeklyWorkTimes map[int]map[string]int, err error) {
	weeklyWorkTimes = make(map[int]map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return nil, err
	}

	rows, err := a.db.Table("work_hours").
		Select("strftime('%W', date) - strftime('%W', date('now','start of month')) + (strftime('%w', date('now','start of month')) <> '1') as week, projects.name, COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
		Group("week, projects.name").
		Rows()
	if err != nil {
		Logger.Println(err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var week int
		var project string
		var seconds int
		if err := rows.Scan(&week, &project, &seconds); err != nil {
			Logger.Println(err)
			return nil, err
		}
		if _, ok := weeklyWorkTimes[week]; !ok {
			weeklyWorkTimes[week] = make(map[string]int)
		}
		weeklyWorkTimes[week][project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return weeklyWorkTimes, nil
}

// GetMonthlyWorkTime returns the total seconds worked for each month of the specified year
func (a *App) GetMonthlyWorkTime(year int, organizationName string) (monthlyWorkTimes map[int]map[string]int, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return nil, err
	}

	rows, err := a.db.Table("work_hours").
		Select("strftime('%m', date) as month, projects.name, COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d", year), organization.ID).
		Group("month, projects.name").
		Rows()
	if err != nil {
		Logger.Println(err)
		return nil, err
	}
	defer rows.Close()

	monthlyWorkTimes = make(map[int]map[string]int)
	for rows.Next() {
		var month int
		var project string
		var seconds int
		if err := rows.Scan(&month, &project, &seconds); err != nil {
			return nil, err
		}
		if _, ok := monthlyWorkTimes[month]; !ok {
			monthlyWorkTimes[month] = make(map[string]int)
		}
		monthlyWorkTimes[month][project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return monthlyWorkTimes, nil
}

// GetYearlyWorkTime returns the total seconds worked for the specified year
func (a *App) GetYearlyWorkTime(year int, organizationName string) (yearlyWorkTime int, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return 0, err
	}

	row := a.db.Table("work_hours").
		Select("COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d", year), organization.ID).
		Row()

	err = row.Scan(&yearlyWorkTime)
	if err != nil {
		Logger.Println(err)
		if err == sql.ErrNoRows {
			// No entry for the given year
			return 0, nil
		}
		return 0, err
	}

	return yearlyWorkTime, nil
}

// GetYearlyWorkTimeByProject returns the total seconds worked for each project for the specified year
func (a *App) GetYearlyWorkTimeByProject(year int, organizationName string) (yearlyWorkTimes map[string]int, err error) {
	yearlyWorkTimes = make(map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationName)
	if err != nil {
		return nil, err
	}

	rows, err := a.db.Table("work_hours").
		Select("projects.name, COALESCE(SUM(work_hours.seconds), 0) as seconds").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d", year), organization.ID).
		Group("projects.name").
		Rows()
	if err != nil {
		Logger.Println(err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var project string
		var seconds int
		if err := rows.Scan(&project, &seconds); err != nil {
			Logger.Println(err)
			return nil, err
		}
		yearlyWorkTimes[project] = seconds
	}

	if err := rows.Err(); err != nil {
		Logger.Println(err)
		return nil, err
	}

	return yearlyWorkTimes, nil
}
