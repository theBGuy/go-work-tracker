//go:build windows
// +build windows

package auto_update

import (
	"log"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"syscall"

	"golang.org/x/sys/windows"
)

func runMeElevated() {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		verb := "runas"
		exe, _ := os.Executable()
		cwd, _ := os.Getwd()
		args := strings.Join(os.Args[1:], " ")

		verbPtr, _ := syscall.UTF16PtrFromString(verb)
		exePtr, _ := syscall.UTF16PtrFromString(exe)
		cwdPtr, _ := syscall.UTF16PtrFromString(cwd)
		argPtr, _ := syscall.UTF16PtrFromString(args)

		var showCmd int32 = 1 //SW_NORMAL

		err := windows.ShellExecute(0, verbPtr, exePtr, argPtr, cwdPtr, showCmd)
		if err != nil {
			log.Fatal(err)
		}
		os.Exit(0)
	default:
		log.Fatalf("Unsupported platform: %s", runtime.GOOS)
	}

	// Run the command
	err := cmd.Run()
	if err != nil {
		log.Fatal(err)
	}
}
