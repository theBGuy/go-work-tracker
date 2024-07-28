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

func (a *App) getOrganization(organizationID uint) (Organization, error) {
	var organization Organization

	err := a.db.
		Where("organizations.deleted_at IS NULL"). // Ignore deleted organizations
		Where(&Organization{ID: organizationID}).
		First(&organization).Error

	if err != nil {
		Logger.Println(err)
		return Organization{}, err
	}
	return organization, nil
}

func (a *App) getProject(projectID uint) (Project, error) {
	var project Project
	err := a.db.
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where(&Project{ID: projectID}).
		First(&project).Error
	if err != nil {
		Logger.Println(err)
		return Project{}, err
	}
	return project, nil
}

type NewOrgRet struct {
	Organization Organization `json:"organization"`
	Project      Project      `json:"project"`
}

func (a *App) NewOrganization(organizationName string, projectName string) (NewOrgRet, error) {
	if organizationName == "" || projectName == "" {
		return NewOrgRet{}, errors.New("organization name or project name is empty")
	}

	// Check if organization exists, if not create it
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			organization = Organization{Name: organizationName}
			if err := a.db.Create(&organization).Error; err != nil {
				return NewOrgRet{}, err
			}
		} else {
			return NewOrgRet{}, err
		}
	}

	// Check if project exists within the organization, if not create it
	var project Project
	if err := a.db.Where("name = ? AND organization_id = ?", projectName, organization.ID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			project = Project{Name: projectName, OrganizationID: organization.ID}
			if err := a.db.Create(&project).Error; err != nil {
				return NewOrgRet{}, err
			}
		} else {
			return NewOrgRet{}, err
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
	return NewOrgRet{Organization: organization, Project: project}, nil
}

func (a *App) SetOrganization(organizationName string, projectName string) {
	if a.isRunning {
		a.StopTimer()
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

	a.organization = organization
	a.project = project
}

func (a *App) RenameOrganization(organizationID uint, newName string) (Organization, error) {
	if newName == "" {
		return Organization{}, errors.New("organization name is empty")
	}

	organization, err := a.getOrganization(organizationID)
	if err != nil {
		return Organization{}, err
	}

	// Update the organization's name
	organization.Name = newName
	if err := a.db.Save(&organization).Error; err != nil {
		handleDBError(err)
	}
	return organization, nil
}

func (a *App) ToggleFavoriteOrganization(organizationID uint) {
	organization, err := a.getOrganization(organizationID)
	if err != nil {
		handleDBError(err)
	}

	organization.Favorite = !organization.Favorite
	if err := a.db.Save(&organization).Error; err != nil {
		handleDBError(err)
	}
}

// Create a new project for the specified organization
func (a *App) NewProject(organizationName string, projectName string) (Project, error) {
	if projectName == "" || organizationName == "" {
		return Project{}, errors.New("project name or organization name is empty")
	}

	// Check if the organization exists, if not create it
	var organization Organization
	if err := a.db.Where(&Organization{Name: organizationName}).First(&organization).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			organization = Organization{Name: organizationName}
			if err := a.db.Create(&organization).Error; err != nil {
				return Project{}, err
			}
		} else {
			return Project{}, err
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
	return project, nil
}

func (a *App) RenameProject(projectID uint, newName string) (Project, error) {
	if newName == "" || projectID == 0 {
		return Project{}, errors.New("project name is empty or project ID is 0")
	}

	// Find the project within the organization
	var project Project
	if err := a.db.Where(&Project{ID: projectID}).First(&project).Error; err != nil {
		handleDBError(err)
	}

	// Update the project's name
	project.Name = newName
	if err := a.db.Save(&project).Error; err != nil {
		handleDBError(err)
	}
	return project, nil
}

func (a *App) DeleteProject(projectID uint) {
	if projectID == 0 {
		return
	}

	var project Project
	if err := a.db.Where(&Project{ID: projectID}).First(&project).Error; err != nil {
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

func (a *App) ToggleFavoriteProject(projectID uint) {
	if projectID == 0 {
		return
	}

	project, err := a.getProject(projectID)
	if err != nil {
		handleDBError(err)
	}

	project.Favorite = !project.Favorite
	if err := a.db.Save(&project).Error; err != nil {
		handleDBError(err)
	}
}

// GetProjects returns the list of projects for the specified organization
func (a *App) GetProjects(organizationID uint) (projects []Project, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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

func (a *App) DeleteOrganization(organizationID uint) {
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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

func (a *App) saveTimer(projectID uint) {
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

	// Find the project within the organization
	project, err := a.getProject(projectID)
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
func (a *App) GetWorkTime(date string, organizationID uint) (seconds int, err error) {
	if date == "" || organizationID == 0 {
		return 0, nil
	}

	// Find the organization
	organization, err := a.getOrganization(organizationID)
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
func (a *App) GetDailyWorkTimeByMonth(year int, month time.Month, organizationID uint) (dailyWorkTime map[string]map[string]int, err error) {
	dailyWorkTime = make(map[string]map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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
func (a *App) GetWorkTimeByProject(projectID uint, date string) (seconds int, err error) {
	if projectID == 0 {
		return 0, nil
	}

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	project, err := a.getProject(projectID)
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
func (a *App) GetWeeklyWorkTime(year int, month time.Month, organizationID uint) (weeklyWorkTimes map[int]map[string]int, err error) {
	weeklyWorkTimes = make(map[int]map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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
		adjustedWeek := week + 1
		if _, ok := weeklyWorkTimes[adjustedWeek]; !ok {
			weeklyWorkTimes[adjustedWeek] = make(map[string]int)
		}
		weeklyWorkTimes[adjustedWeek][project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return weeklyWorkTimes, nil
}

// GetWorkTimeByWeek returns the total seconds worked for each project of a week of the specified month
func (a *App) GetWorkTimeByWeek(year int, month time.Month, week int, organizationID uint) (workTime map[string]int, err error) {
	workTime = make(map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationID)
	if err != nil {
		return nil, err
	}

	rows, err := a.db.Table("work_hours").
		Select("projects.name, COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
		Where("strftime('%W', date) - strftime('%W', date('now','start of month')) + (strftime('%w', date('now','start of month')) <> '1') = ?", week-1).
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
		workTime[project] = seconds
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return workTime, nil
}

// GetOrgWorkTimeByWeek returns the total seconds worked an organization a week of the specified month
func (a *App) GetOrgWorkTimeByWeek(year int, month time.Month, week int, organizationID uint) (workTime int, err error) {
	workTime = 0
	// Find the organization
	organization, err := a.getOrganization(organizationID)
	if err != nil {
		return 0, err
	}

	err = a.db.Table("work_hours").
		Select("COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
		Where("strftime('%W', date) - strftime('%W', date('now','start of month')) + (strftime('%w', date('now','start of month')) <> '1') = ?", week-1).
		Row().Scan(&workTime)

	if err != nil {
		Logger.Println(err)
		return 0, err
	}

	return workTime, nil
}

// GetProjWorkTimeByWeek returns the total seconds worked a project of a week of the specified month
func (a *App) GetProjWorkTimeByWeek(year int, month time.Month, week int, projectID uint) (workTime int, err error) {
	workTime = 0
	project, err := a.getProject(projectID)
	if err != nil {
		return 0, err
	}

	err = a.db.Table("work_hours").
		Select("COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ?", fmt.Sprintf("%04d-%02d", year, month)).
		Where("strftime('%W', date) - strftime('%W', date('now','start of month')) + (strftime('%w', date('now','start of month')) <> '1') = ?", week-1).
		Where("projects.id = ?", project.ID).
		Row().Scan(&workTime)

	if err != nil {
		Logger.Println(err)
		return 0, err
	}

	return workTime, nil
}

// GetMonthlyWorkTime returns the total seconds worked for each month of the specified year
func (a *App) GetMonthlyWorkTime(year int, organizationID uint) (monthlyWorkTimes map[int]map[string]int, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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

// GetProjWorkTimeByMonth returns the total seconds worked for a project of a month of the specified year
func (a *App) GetProjWorkTimeByMonth(year int, month time.Month, projectID uint) (workTime int, err error) {
	project, err := a.getProject(projectID)
	if err != nil {
		return 0, err
	}

	err = a.db.Table("work_hours").
		Select("COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ?", fmt.Sprintf("%04d-%02d", year, month)).
		Where("projects.id = ?", project.ID).
		Row().Scan(&workTime)

	if err != nil {
		Logger.Println(err)
		return 0, err
	}

	return workTime, nil
}

// GetOrgWorkTimeByMonth returns the total seconds worked for a organization of a month of the specified year
func (a *App) GetOrgWorkTimeByMonth(year int, month time.Month, organizationID uint) (workTime int, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationID)
	if err != nil {
		return 0, err
	}

	err = a.db.Table("work_hours").
		Select("COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
		Row().Scan(&workTime)

	if err != nil {
		Logger.Println(err)
		return 0, err
	}

	return workTime, nil
}

// GetWorkTimeByMonth returns the total seconds worked for each project of a month of the specified year
func (a *App) GetWorkTimeByMonth(year int, month time.Month, organizationID uint) (workTime map[string]int, err error) {
	workTime = make(map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationID)
	if err != nil {
		return nil, err
	}

	rows, err := a.db.Table("work_hours").
		Select("projects.name, COALESCE(SUM(work_hours.seconds), 0)").
		Joins("JOIN projects ON projects.id = work_hours.project_id").
		Where("projects.deleted_at IS NULL"). // Ignore deleted projects
		Where("strftime('%Y-%m', date) = ? AND projects.organization_id = ?", fmt.Sprintf("%04d-%02d", year, month), organization.ID).
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
		workTime[project] = seconds
	}

	if err := rows.Err(); err != nil {
		Logger.Println(err)
		return nil, err
	}

	return workTime, nil
}

// GetYearlyWorkTime returns the total seconds worked for the specified year
func (a *App) GetYearlyWorkTime(year int, organizationID uint) (yearlyWorkTime int, err error) {
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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
func (a *App) GetYearlyWorkTimeByProject(year int, organizationID uint) (yearlyWorkTimes map[string]int, err error) {
	yearlyWorkTimes = make(map[string]int)
	// Find the organization
	organization, err := a.getOrganization(organizationID)
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
