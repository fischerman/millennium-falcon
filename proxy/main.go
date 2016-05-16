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

	ha_config.HttpPort = os.Getenv("HTTP_PORT")
	ha_config.HttpsPort = os.Getenv("HTTPS_PORT")
	ha_config.StatsUser = os.Getenv("STATS_USER")
	ha_config.StatsPass = os.Getenv("STATS_PASS")
	ha_config.StatsPort = os.Getenv("STATS_PORT")
	ha_config.StatsEnabled = len(ha_config.StatsPass) > 0
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
