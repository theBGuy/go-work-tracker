package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

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

// fixOutdatedDb checks if the database is outdated and updates it if necessary
// This is necessary because the primary key setup for the work_hours table was changed in version 0.2.0
func fixOutdatedDb(db *sql.DB) {
	// Query the sqlite_master table to get the SQL used to create the work_hours table
	row := db.QueryRow("SELECT sql FROM sqlite_master WHERE type='table' AND name='work_hours'")
	var createSQL string
	err := row.Scan(&createSQL)
	if err != nil {
		panic(err)
	}

	// Check if the primary key setup matches the expected setup
	expected := "PRIMARY KEY(date, organization, project)"
	if !strings.Contains(createSQL, expected) {
		log.Println("Database is outdated, updating...")
		_, err = db.Exec(`ALTER TABLE work_hours ADD COLUMN project TEXT`)
		if err != nil {
			fmt.Println(err.Error())
			if strings.Contains(err.Error(), "duplicate column name") {
				// Column already exists, so ignore the error
			} else {
				panic(err)
			}
		}

		_, err = db.Exec(`UPDATE work_hours SET project = 'default' WHERE project IS NULL`)
		if err != nil {
			panic(err)
		}
		// Drop new_work_hours table if it exists - leftover from previous migration or crash
		_, err = db.Exec(`DROP TABLE IF EXISTS new_work_hours`)
		if err != nil {
			panic(err)
		}

		// Create new table
		_, err := db.Exec(`CREATE TABLE new_work_hours (
			date TEXT NOT NULL,
			organization TEXT NOT NULL,
			project TEXT NOT NULL DEFAULT 'default',
			seconds INTEGER NOT NULL,
			PRIMARY KEY(date, organization, project)
		)`)
		if err != nil {
			panic(err)
		}

		// Copy data from old table to new table
		_, err = db.Exec(`INSERT INTO new_work_hours(date, organization, project, seconds)
			SELECT date, organization, IFNULL(project, 'default'), seconds
			FROM work_hours`)
		if err != nil {
			panic(err)
		}

		// Delete old table
		_, err = db.Exec(`DROP TABLE work_hours`)
		if err != nil {
			panic(err)
		}

		// Rename new table to old table name
		_, err = db.Exec(`ALTER TABLE new_work_hours RENAME TO work_hours`)
		if err != nil {
			panic(err)
		}
	}
}
