//go:build !windows
// +build !windows

package main

import (
	"log"
	"os"
	"os/exec"
	"runtime"
	"syscall"
)

func runMeElevated() {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin", "linux":
		// On macOS and Linux, you can use the "sudo" command to run a command with elevated privileges
		exe, _ := os.Executable()
		args := os.Args[1:]

		cmd = exec.Command("sudo", append([]string{exe}, args...)...)

		// Set the command to run in a new session
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	default:
		log.Fatalf("Unsupported platform: %s", runtime.GOOS)
	}

	// Run the command
	err := cmd.Run()
	if err != nil {
		log.Fatal(err)
	}
}
