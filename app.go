package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/theBGuy/go-work-tracker/auto_update"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	_ "github.com/mattn/go-sqlite3"
	"gorm.io/gorm"
)

// App struct
type App struct {
	ctx                context.Context
	db                 *gorm.DB
	startTime          time.Time
	lastSave           time.Time
	isRunning          bool
	organization       Organization
	project            Project
	version            string
	environment        string
	newVersonAvailable bool
}

var ctx context.Context
var cancel context.CancelFunc

type WailsConfig struct {
	Info Info `json:"info"`
}

type Info struct {
	ProductVersion string `json:"productVersion"`
	Environment    string `json:"environment"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	version := os.Getenv("APP_ENV")
	if version == "" {
		version, _ = readVersionConfig(WailsConfigFile)
	}

	environment := os.Getenv("APP_ENV")
	if environment == "" {
		environment, _ = readEnvConfig(WailsConfigFile)
	}

	dbDir, err := getSaveDir(environment)
	if err != nil {
		panic(err)
	}
	fmt.Println("Starting Go Work Tracker. \nVersion: ", version, "\nEnvironment: ", environment, "\nSave directory: ", dbDir)

	// Check for updates
	var newVersonAvailable bool
	if environment == "production" {
		newVersonAvailable = auto_update.Run(version)
	}

	db := NewDb(dbDir)

	return &App{
		db:                 db,
		version:            version,
		environment:        environment,
		newVersonAvailable: newVersonAvailable,
	}
}

func (a *App) GetVersion() string {
	return a.version
}

func (a *App) UpdateAvailable() bool {
	return a.newVersonAvailable
}

type ActiveTimer struct {
	Organization Organization `json:"organization"`
	Project      Project      `json:"project"`
	IsRunning    bool         `json:"isRunning"`
	TimeElapsed  int          `json:"timeElapsed"`
}

func (a *App) GetActiveTimer() ActiveTimer {
	return ActiveTimer{
		Organization: a.organization,
		Project:      a.project,
		IsRunning:    a.isRunning,
		TimeElapsed:  a.TimeElapsed(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.monitorTime()
	a.monitorUpdates()
	a.cleanupRoutine()
}

// shutdown is called at termination
func (a *App) shutdown(ctx context.Context) {
	fmt.Println("Shutting down...")
	if a.isRunning {
		a.StopTimer()
	}
}

func (a *App) monitorTime() {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for range ticker.C {
			if a.isRunning && time.Now().Format("2006-01-02") != a.startTime.Format("2006-01-02") {
				a.StopTimer()
				a.StartTimer(a.organization, a.project)
				runtime.EventsEmit(a.ctx, "new-day")
			}
		}
	}()
}

func (a *App) monitorUpdates() {
	if a.environment != "production" {
		return
	}
	ticker := time.NewTicker(1 * time.Hour)

	runtime.EventsOn(a.ctx, "do-update", func(optionalData ...interface{}) {
		a.shutdown(a.ctx)
		auto_update.Run(a.version)
	})

	go func() {
		for range ticker.C {
			if !a.newVersonAvailable {
				newVersonAvailable, _ := auto_update.GetUpdateAvailable(a.version)
				if newVersonAvailable {
					a.newVersonAvailable = true
					runtime.EventsEmit(a.ctx, "update-available")
				}
			}
		}
	}()
}

func (a *App) cleanupRoutine() {
	// Run on startup then every 24 hours
	a.cleanupSoftDeletedRecords()
	ticker := time.NewTicker(24 * time.Hour)

	go func() {
		for range ticker.C {
			a.cleanupSoftDeletedRecords()
		}
	}()
}

func (a *App) CheckForUpdates() bool {
	newVersonAvailable, _ := auto_update.GetUpdateAvailable(a.version)
	if newVersonAvailable {
		a.newVersonAvailable = true
		runtime.EventsEmit(a.ctx, "update-available")
	}
	return newVersonAvailable
}

func (a *App) TimerRunning() bool {
	return a.isRunning
}

func (a *App) StartTimer(organization Organization, project Project) {
	a.startTime = time.Now()
	a.organization = organization
	a.project = project
	a.isRunning = true

	ctx, cancel = context.WithCancel(context.Background())

	go func() {
		for {
			select {
			case <-time.After(1 * time.Minute):
				a.saveTimer(a.project.ID)
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (a *App) StopTimer() {
	if !a.isRunning {
		return
	}
	secsWork := a.saveTimer(a.project.ID)
	a.NewWorkSession(a.project.ID, secsWork)
	cancel()
	a.isRunning = false
	a.lastSave = time.Time{}
}

// TimeElapsed returns the total seconds worked in the current timer session
func (a *App) TimeElapsed() int {
	if a.isRunning {
		return int(time.Since(a.startTime).Seconds())
	}
	return 0
}

func (a *App) ShowWindow() {
	if runtime.WindowIsMinimised(a.ctx) {
		runtime.WindowUnminimise(a.ctx)
	} else {
		runtime.WindowSetAlwaysOnTop(a.ctx, true)
	}
	runtime.WindowShow(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)
}

// Display a confirmation dialog
func (a *App) ConfirmAction(title string, message string) bool {
	selection, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         title,
		Message:       message,
		DefaultButton: "No",
	})
	if err != nil {
		fmt.Println(err)
		return false
	}
	return selection == "Yes"
}

var normalOrgX, normalOrgY int
var minOrgX, minOrgY int

// type WindowSize struct {
// 	Width  int `json:"width"`
// 	Height int `json:"height"`
// }

// func getScreenSize() (WindowSize, error) {
// 	if err := glfw.Init(); err != nil {
// 		fmt.Println("failed to initialize glfw:", err)
// 		return WindowSize{}, err
// 	}
// 	defer glfw.Terminate()

// 	// Get the primary monitor
// 	monitor := glfw.GetPrimaryMonitor()
// 	if monitor == nil {
// 		fmt.Println("failed to get primary monitor")
// 		return WindowSize{}, errors.New("failed to get primary monitor")
// 	}

// 	// Get the video mode of the primary monitor
// 	mode := monitor.GetVideoMode()
// 	if mode == nil {
// 		fmt.Println("failed to get video mode")
// 		return WindowSize{}, errors.New("failed to get video mode")
// 	}

// 	return WindowSize{Width: mode.Width, Height: mode.Height}, nil
// }

func (a *App) NormalizeWindow() {
	runtime.WindowSetMaxSize(a.ctx, 0, 0)
	runtime.WindowCenter(a.ctx)
	runtime.WindowSetSize(a.ctx, WIN_WIDTH, WIN_HEIGHT)
	runtime.WindowSetMinSize(a.ctx, MIN_WIN_WIDTH, MIN_WIN_HEIGHT)
	runtime.WindowCenter(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)
}

func (a *App) MinimizeWindow() {
	runtime.WindowSetMinSize(a.ctx, WIDGET_WIDTH, WIDGET_HEIGHT)
	runtime.WindowSetSize(a.ctx, WIDGET_WIDTH, WIDGET_HEIGHT)
	runtime.WindowSetMaxSize(a.ctx, WIDGET_WIDTH, WIDGET_HEIGHT)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
}
