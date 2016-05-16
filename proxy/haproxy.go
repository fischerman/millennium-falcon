package main

import (
	"bufio"
	"log"
	"os"
	"os/exec"
	"syscall"
	"text/template"
)

type HAProxyConfig struct {
	HttpPort     string
	HttpsPort    string
	StatsUser    string
	StatsPass    string
	StatsPort    string
	StatsEnabled bool
}

func startHAProxy() {
	ha_cp := exec.Command("haproxy", "-p", "/run/haproxy.pid", "-f", "/haproxy.cfg")
	ha_cp.Stdout = os.Stdout
	ha_cp.Stderr = os.Stderr

	if err := ha_cp.Start(); err != nil {
		panic(err)
	}

	log.Println("HAProxy is now running")
	ha_process = ha_cp.Process

	if err := ha_cp.Wait(); err != nil {
		log.Printf("HAProxy finished with error: %v\n", err)
	}
}

func updateProxyState() {
	containers := readDockerContainers()
	for _, c := range containers {
		lbl := func(name string) string {
			return c.Labels["de.bfischerman.proxy-"+name]
		}

		log.Printf("%v\n", c.Names)
		log.Printf("%v\n", c.Labels)

		switch {
		case lbl("mode") == "tcp":
			log.Println("detected tcp")
			// TODO: generate config
		case lbl("mode") == "http", len(lbl("url")) > 0:
			log.Println("detected http")
			// TODO: generate config
		}
	}

	// TODO: write Config & (re)load HAProxy only if config has changed
	writeConfig()
	if ha_process == nil {
		go startHAProxy()
	} else {
		ha_process.Signal(syscall.SIGHUP)
	}
}

func writeConfig() {
	f, err := os.Create("/haproxy.cfg")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	wr := bufio.NewWriter(f)

	t := template.Must(template.New("haproxy.cfg").Parse(ha_tpl))
	if debug {
		t.Execute(os.Stdout, ha_config)
	}
	err = t.Execute(wr, ha_config)
	if err != nil {
		log.Println(err)
	}
	wr.Flush()
}
