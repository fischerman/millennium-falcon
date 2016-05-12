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
    {{~it.httpRoutes :value:index}}
    {{? value.http || value.redirect}}
    use_backend {{=value.name}} if { path_beg {{=value.pathname}} {{?value.domain}} && hdr_end(host) -i {{=value.domain}} {{?}}} 
    {{?}}
    {{~}}

frontend https
    bind *:81
    mode http
    {{~it.httpRoutes :value:index}}
    {{? value.https}}
    use_backend {{=value.name}} if { path_beg {{=value.pathname}} {{?value.domain}} && hdr_end(host) -i {{=value.domain}} {{?}}} 
    {{?}}
    {{~}}

{{~it.httpRoutes :value:index}}
backend {{=value.name}}
    {{? value.redirect}}
    redirect scheme https if !{ ssl_fc }
    {{?}}
	option forwardfor
	option originalto
	server {{=value.name}} 127.0.0.1:{{=value.port}}
{{~}}

{{~it.tcpRoutes :value:index}}
listen {{=value.name}}
    bind *:{{=value.source}}
    mode tcp
    server {{=value.name}} 127.0.0.1:{{=value.target}}
{{~}}
`;