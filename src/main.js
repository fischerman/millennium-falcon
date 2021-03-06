'use strict'
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var util = require('util');
var fs = require('fs');
let parseUrl = require('url').parse;
var Rx = require('rx');
let async = require('async');
let doT = require('dot');
doT.templateSettings.strip = false;
let template = require('./template.js');
let templateFn = doT.template(template);
let ha_cp;
let dockerContainerSubject = new Rx.Subject();
let proxyStateChangedSubject = new Rx.Subject();
let staticRoutesSubject = new Rx.Subject();
let previousProxyState = null;
let env = process.env;
let dockerState;
let staticRoutes;

setInterval(refreshDockerState, 5000);
refreshDockerState();

setInterval(refreshStaticRoutes, 5000);
refreshStaticRoutes();

dockerContainerSubject.subscribe((newDockerState) => {
	dockerState = newDockerState;
	updateProxyState();
});

staticRoutesSubject.subscribe((newStaticRoutes) => {
	staticRoutes = newStaticRoutes;
	updateProxyState();
});

proxyStateChangedSubject.subscribe((proxyState) => {
	writeConfig(proxyState, (err) => {
		if(err)
			throw err;

		if(!ha_cp) {
			startHAProxy();
		} else {
			ha_cp.kill('SIGHUP');	
		}
	});
});

function updateProxyState() {
	if(dockerState && staticRoutes) {
		let proxyState = generateProxyState(dockerState, staticRoutes);
		let serializedState = JSON.stringify(proxyState);
		if(serializedState != previousProxyState) {
			console.log('configuration changed');
			previousProxyState = serializedState;
			proxyStateChangedSubject.onNext(proxyState);
		}
	}
}

function refreshStaticRoutes() {
	readStaticRoutesFromDisk((staticRoutes) => {
		staticRoutesSubject.onNext(staticRoutes);
	});
}

function refreshDockerState() {
	readDockerContainers((dockerState) => {
		dockerContainerSubject.onNext(dockerState);
	});
}

function startHAProxy() {
	ha_cp = spawn('/usr/local/sbin/haproxy-systemd-wrapper', ["-p", "/run/haproxy.pid", "-f", "/haproxy.cfg"]);
	ha_cp.stdout.pipe(process.stdout);
	ha_cp.stderr.pipe(process.stderr);
	ha_cp.on('exit', () => {
		console.error('ha exited');
		//process.exit(7);
	});
}

function readDockerContainers(cb) {
	exec('curl -XGET --unix-socket /var/run/docker.sock http:/containers/json',{}, (err, stdout_string) => {
		if(err)
			throw err;
		
		let stdout = JSON.parse(stdout_string);
		//console.log(util.inspect(stdout,{depth: null}));
		cb(stdout);
	});
}

function readStaticRoutesFromDisk(cb) {
	let routeFileNameEnding = ".route.json";
	fs.readdir('/routes', (err, files) => {
		if(err) {
			throw err;
		}
		let routeFileNames = files.filter((file) => { 
			return file.substring(file.length - routeFileNameEnding.length) === routeFileNameEnding;
		});
		routeFileNames = routeFileNames.map((fileName) => {
			return '/routes/' + fileName;
		});
		async.map(routeFileNames, readAsync, (err, routeFileContents) => {
			if(err) {
				throw err;
			}
			let routes = routeFileContents.map(JSON.parse);
			cb(routes);
		});
	});
}

function generateProxyState(dockerState, staticRoutes) {
	let httpRoutes = [];
	let tcpRoutes = [];
	dockerState.forEach((container) => {
		var lbl = function(name) {
			return container.Labels[`de.bfischerman.proxy-${name}`];
		};
		if(lbl("mode") == "tcp") {
			console.log('deteced tcp')
			let port;
			if(lbl("target")) {
				container.Ports.forEach((containerPort) => {
					if(containerPort.PrivatePort.toString() == lbl("target")) {
						port = containerPort;
					}
				});
			} else if(container.Ports.length == 1) {
				port = container.ports[0];
			} else {
				console.log("More than one port available!", container);
			}
			if(port) {
				let route = {
					name: container.Id,
					source: lbl("source"),
					target: port.PublicPort.toString()
				}
				tcpRoutes.push(route);
			}

		} else if(lbl("mode") == "http" || lbl("url")) {
			let url = parseUrl('http://' + lbl("url"), true, true);
			let protocol = lbl("protocol") || 'default';
			console.log(url);
			let port;
			if(lbl("port")) {
				container.Ports.forEach((containerPort) => {
					if(containerPort.PrivatePort.toString() == lbl("port")) {
						port = containerPort;
					}
				});
			} else if(container.Ports.length == 1) {
				port = container.ports[0];
			} else {
				console.log("More than one port available!");
			}
			if(port) {
				let route = {
					name: container.Id,
					domain: url.hostname != '' ? url.hostname : null,
					pathname: url.pathname,
					port: port.PublicPort.toString(),
					protocol: protocol,
					http: protocol == 'http' || protocol == 'both' || protocol == 'default',
					https: protocol == 'https' || protocol == 'both',
					redirect: lbl("redirect-http") == 'true' || !lbl("redirect-http")
				};
				httpRoutes.push(route);
			}	
		}
	});
	return {
		httpRoutes: httpRoutes,
		tcpRoutes: tcpRoutes,
		staticRoutes: staticRoutes,
		httpPort: env["HTTP_PORT"] == "disable" ? false : (env["HTTP_PORT"] || "80"),
		httpsPort: env["HTTPS_PORT"] == "disable" ? false : (env["HTTPS_PORT"] || "443"),
		statsPass: env["STATS_PASS"] || false,
		statsUser: env["STATS_USER"] || "admin"
	};
}

function writeConfig(proxyState, cb) {

    let config = templateFn(proxyState);
	
	console.log(config);

	fs.writeFile('/haproxy.cfg', config, {}, (err) => {
		if(err)
			throw err;
		cb(err);
	});
}

function readAsync(file, callback) {
    fs.readFile(file, 'utf8', callback);
}

process.on('SIGINT', () => {
	process.exit(0);
})