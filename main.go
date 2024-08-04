package main

import (
	"embed"
	"fmt"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed wails.json
var WailsConfigFile []byte

const (
	WIN_HEIGHT    = 768
	WIN_WIDTH     = 1024
	WIDGET_HEIGHT = 100
	WIDGET_WIDTH  = 300
)

func main() {
	// Create an instance of the app structure
	app := NewApp()
	appTitle := "Go Work Tracker"
	if app.environment == "development" {
		appTitle = appTitle + " (DEV)"
	}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  appTitle,
		Width:  WIN_WIDTH,
		Height: WIN_HEIGHT,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		fmt.Println("Error:" + err.Error())
	}
}
