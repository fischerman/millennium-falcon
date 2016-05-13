module.exports = `
global

    ssl-default-bind-options no-sslv3
    ssl-default-bind-ciphers kEECDH+aRSA+AES:kRSA+AES:+AES256:RC4-SHA:!kEDH:!LOW:!EXP:!MD5:!aNULL:!eNULL

defaults
    log     global
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    
{{?it.httpPort}}
frontend http
    bind *:{{=it.httpPort}}
    mode http
    {{~it.httpRoutes :value:index}}
    {{? value.http || value.redirect}}
    use_backend {{=value.name}} if { path_beg {{=value.pathname}} {{?value.domain}} && hdr_end(host) -i {{=value.domain}} {{?}}} 
    {{?}}
    {{~}}
{{?}}

{{?it.httpsPort}}
frontend https
    bind *:{{=it.httpsPort}} ssl crt /certs/combined.pem
    mode http
    {{~it.httpRoutes :value:index}}
    {{? value.https}}
    use_backend {{=value.name}} if { path_beg {{=value.pathname}} {{?value.domain}} && hdr_end(host) -i {{=value.domain}} {{?}}} 
    {{?}}
    {{~}}
    {{?it.statsPass}}
    use_backend stats if { path_beg /stats }
    {{?}}
{{?}}

{{~it.httpRoutes :value:index}}
backend {{=value.name}}
    mode http
    {{? value.redirect}}
    redirect scheme https if !{ ssl_fc }
    {{?}}
	option forwardfor
	option originalto
	server {{=value.name}} 127.0.0.1:{{=value.port}}
{{~}}

{{?it.statsPass}}
backend stats
    mode http
    stats enable
    stats uri /stats
    stats realm Haproxy\ Statistics
    stats auth {{=it.statsUser}}:{{=it.statsPass}}
{{?}}

{{~it.tcpRoutes :value:index}}
listen {{=value.name}}
    bind *:{{=value.source}}
    mode tcp
    server {{=value.name}} 127.0.0.1:{{=value.target}}
{{~}}
`;