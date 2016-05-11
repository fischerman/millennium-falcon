module.exports = `
defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    stats enable
    stats uri /stats
    stats realm Haproxy\ Statistics
    stats auth admin:pa$$Word

frontend http
    bind *:80
    mode http
    {{~it.routes :value:index}}
    use_backend {{=value.name}} if { hdr_end(host) -i {{=value.domain}} }
    {{~}}

{{~it.routes :value:index}}
backend {{=value.name}}
	option forwardfor
	option originalto
	server {{=value.name}} 127.0.0.1:{{=value.port}}
{{~}}

`;