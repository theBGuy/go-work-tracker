package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
)

// Check if the application has write permission in the save directory -- hacky but works
func checkWritePermission() bool {
	tmpfile, err := os.Create("test" + strconv.Itoa(rand.Intn(1000)) + ".tmp")
	if err != nil {
		fmt.Println(err)
		tmpfile.Close()
		return false
	}
	tmpfile.Close()

	// Remove all .tmp files in the directory
	files, err := filepath.Glob("*.tmp")
	if err != nil {
		fmt.Println(err)
		return false
	}

	for _, f := range files {
		if err := os.Remove(f); err != nil {
			fmt.Println(err)
			return false
		}
	}

	return true
}

func getSaveDir(environment string) (string, error) {
	var dataDir string
	switch runtime.GOOS {
	case "windows":
		dataDir = os.Getenv("APPDATA")
	case "darwin":
		dataDir = filepath.Join(os.Getenv("HOME"), "Library", "Application Support")
	default: // Unix-like system
		dataDir = os.Getenv("XDG_DATA_HOME")
		if dataDir == "" {
			dataDir = filepath.Join(os.Getenv("HOME"), ".local", "share")
		}
	}

	saveDir := filepath.Join(dataDir, "Go-Work-Tracker")

	if environment == "development" {
		fmt.Println("Running in development mode")
		saveDir = filepath.Join(saveDir, "dev")
	}

	if _, err := os.Stat(saveDir); os.IsNotExist(err) {
		os.Mkdir(saveDir, 0755)
	}
	return saveDir, nil
}

func readVersionConfig(WailsConfigFile []byte) (string, error) {
	var wailsConfig WailsConfig
	err := json.Unmarshal(WailsConfigFile, &wailsConfig)
	if err != nil {
		return "", err
	}
	return wailsConfig.Info.ProductVersion, nil
}

func readEnvConfig(WailsConfigFile []byte) (string, error) {
	var wailsConfig WailsConfig
	err := json.Unmarshal(WailsConfigFile, &wailsConfig)
	if err != nil {
		return "", err
	}
	return wailsConfig.Info.Environment, nil
}
