package main

const ha_tpl = `
global
	log /dev/log local0
	log /dev/log local1 notice
	stats timeout 30s
	ssl-default-bind-options no-sslv3
	ssl-default-bind-ciphers kEECDH+aRSA+AES:kRSA+AES:+AES256:RC4-SHA:!kEDH:!LOW:!EXP:!MD5:!aNULL:!eNULL

defaults
	log     global
	option  httplog
	option  dontlognull
	timeout connect 5000
	timeout client 50000
	timeout server 50000

{{if .StatsEnabled}}
frontend stats
	bind *:{{.StatsPort}}
	mode http
	stats enable
	stats uri /
	stats realm HAProxy\ Statistics
	stats auth {{.StatsUser}}:{{.StatsPass}}
{{- end}}

{{if .HttpEnabled}}
frontend http
	bind *:{{.HttpPort}}
	mode http

	{{range .HttpRoutes}}
	use_backend {{.Name}} if { path_beg {{.Pathname}} {{.Domain}} && hdr_end(host) -i {{.Domain}} }
	{{end}}
{{end}}

{{if .HttpsEnabled}}
frontend https
	bind *:{{.HttpsPort}}
	mode http
{{end}}

{{range .HttpRoutes}}
backend {{.Name}}
	mode http
	option forwardfor
	option originalto
	server {{.Name}} 127.0.0.1:{{.Port}}
{{end}}
`
