package auto_update

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"syscall"

	"github.com/blang/semver"
	"github.com/minio/selfupdate"
)

type Asset struct {
	Name        string `json:"name"`
	DownloadUrl string `json:"browser_download_url"`
}

type Release struct {
	Name    string `json:"name"`
	TagName string `json:"tag_name"`
	Assets  []Asset
}

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

func restartSelf() error {
	fmt.Println("Restarting application...")
	self, err := os.Executable()
	if err != nil {
		fmt.Println("Error getting executable path:", err)
		return err
	}
	args := os.Args
	env := os.Environ()
	// Windows does not support exec syscall.
	if runtime.GOOS == "windows" {
		cmd := exec.Command(self, args[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		cmd.Env = env
		err := cmd.Start()
		if err == nil {
			os.Exit(0)
		}
		return err
	}
	err = syscall.Exec("./go-work-tracker", args, env)
	if err != nil {
		fmt.Println("Error restarting application:", err)
	}
	return err
}

func DoUpdate(url string) {
	resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error: ", err)
		return
	}
	defer resp.Body.Close()

	err = selfupdate.Apply(resp.Body, selfupdate.Options{})
	if err != nil {
		fmt.Println("Error: ", err)
		return
	}
	restartSelf()
}

func GetUpdateAvailable(version string) (bool, string) {
	resp, err := http.Get("https://api.github.com/repos/thebguy/go-work-tracker/releases/latest")
	if err != nil {
		fmt.Println("Error: ", err.Error(), " while checking for updates")
		return false, ""
	}
	defer resp.Body.Close()

	fmt.Println("Checking for updates...Current version: ", version)

	var release Release
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		fmt.Println("Error: ", err, " while decoding the response body")
		return false, ""
	}

	fmt.Println("Latest release: " + release.TagName)
	if version[0] == 'v' {
		version = version[1:]
	}

	currentVersion, err := semver.Parse(version)
	if err != nil {
		fmt.Println("Error: ", err, " while parsing the current version")
		return false, ""
	}

	latestVersion, err := semver.Parse(release.TagName[1:])
	if err != nil {
		fmt.Println("Error: ", err.Error(), " while parsing the latest version")
		return false, ""
	}

	if len(release.Assets) == 0 {
		fmt.Println("No release files exist for " + release.Name)
		return false, ""
	}

	// Get browser download URL for the asset based on os
	var asset_name string
	switch runtime.GOOS {
	case "windows":
		asset_name = "go-work-tracker.exe"
	case "darwin":
		asset_name = "go-work-tracker.app.zip"
	default: // Unix-like system
		asset_name = "go-work-tracker"
	}

	for _, asset := range release.Assets {
		if asset.Name == asset_name {
			if latestVersion.GT(currentVersion) {
				log.Println("New version available: ", release.TagName)
				return true, asset.DownloadUrl
			}
			break
		}
	}
	return false, ""
}

func Run(version string) bool {
	available, url := GetUpdateAvailable(version)
	if !available {
		return false
	}

	if !checkWritePermission() {
		runMeElevated()
		return true
	}

	DoUpdate(url)
	return false
}
