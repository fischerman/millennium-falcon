package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	signalQueue chan os.Signal
	ha_process  *os.Process
	ha_config   HAProxyConfig
)

const debug = false

func init() {
	signalQueue = make(chan os.Signal, 1)
	signal.Notify(signalQueue, syscall.SIGHUP, os.Interrupt)
}

func main() {
	go handleSignals()

	for {
		updateProxyState()
		time.Sleep(5 * time.Second)
	}
}

func handleSignals() {
	for {
		s := <-signalQueue
		switch s {
		case syscall.SIGHUP:
			log.Println("received external SIGHUP")
			ha_process.Signal(syscall.SIGHUP)
		case os.Interrupt:
			ha_process.Kill()
			os.Exit(0)
		}
	}
}
