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

{{with .HttpPort -}}
frontend http
	bind *:{{.}}
	mode http
{{- end}}
`
