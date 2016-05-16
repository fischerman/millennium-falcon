package main

import (
	"bufio"
	"log"
	"net/url"
	"os"
	"os/exec"
	"reflect"
	"strconv"
	"syscall"
	"text/template"

	"github.com/docker/engine-api/types"
)

type HttpRoute struct {
	Name     string
	Domain   string
	Pathname string
	Port     string
	Protocol string
	Http     bool
	Https    bool
	Redirect bool
}

type HAProxyConfig struct {
	HttpPort     string
	HttpEnabled  bool
	HttpsPort    string
	HttpsEnabled bool
	StatsUser    string
	StatsPass    string
	StatsPort    string
	StatsEnabled bool
	HttpRoutes   []HttpRoute
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
		os.Exit(1)
	}
}

func updateProxyState() {
	var http_routes []HttpRoute

	containers := readDockerContainers()
	for _, c := range containers {
		lbl := func(name string) (string, bool) {
			return c.Labels["de.bfischerman.proxy-"+name], len(c.Labels["de.bfischerman.proxy-"+name]) > 0
		}

		mode := func() string {
			mode, _ := lbl("mode")
			_, url := lbl("url")
			if mode == "tcp" {
				return "tcp"
			}
			if mode == "http" || url {
				return "http"
			}
			return "none"
		}

		switch mode() {
		case "tcp":
			// TODO: generate config
		case "http":
			var (
				protocol string
				port     types.Port
			)

			conUrl, _ := lbl("url")
			myurl, _ := url.Parse("http://" + conUrl)

			if value, set := lbl("protocol"); set {
				protocol = value
			} else {
				protocol = "default"
			}
			if value, set := lbl("port"); set {
				for _, p := range c.Ports {
					if strconv.Itoa(p.PrivatePort) == value {
						port = p
					}
				}
			} else if len(c.Ports) == 1 {
				port = c.Ports[0]
			} else {
				log.Println("More than one port available!")
			}

			route := HttpRoute{
				Name:     c.ID,
				Domain:   myurl.Host,
				Pathname: myurl.Path,
				Port:     strconv.Itoa(port.PublicPort),
				Protocol: protocol,
				Http:     protocol == "http" || protocol == "both" || protocol == "default",
				Https:    protocol == "https" || protocol == "both",
				Redirect: false,
			}
			http_routes = append(http_routes, route)
		}
	}

	newConfig := HAProxyConfig{
		HttpPort:     os.Getenv("HTTP_PORT"),
		HttpEnabled:  len(os.Getenv("HTTP_PORT")) > 0,
		HttpsPort:    os.Getenv("HTTPS_PORT"),
		HttpsEnabled: len(os.Getenv("HTTPS_PORT")) > 0,
		StatsUser:    os.Getenv("STATS_USER"),
		StatsPass:    os.Getenv("STATS_PASS"),
		StatsPort:    os.Getenv("STATS_PORT"),
		StatsEnabled: len(os.Getenv("STATS_PASS")) > 0,
		HttpRoutes:   http_routes,
	}

	if !reflect.DeepEqual(ha_config, newConfig) {
		ha_config = newConfig
		log.Println("Config has changed")
		writeConfig()
		if ha_process == nil {
			go startHAProxy()
		} else {
			ha_process.Signal(syscall.SIGHUP)
		}
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
