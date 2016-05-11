'use strict'
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var util = require('util');
var Rx = require('rx');
let doT = require('dot');
doT.templateSettings.strip = false;
let template = require('./template.js');
let templateFn = doT.template(template);
let ha_cp;
let dockerContainerSubject = new Rx.Subject();
let proxyStateChangedSubject = new Rx.Subject();
let previousProxyState = null;




exec('letsencrypt -n', {}, (err, stdout, stderr) => {
	if(err) {
		console.error(stdout, stderr);
		//throw err;
	}
});

setInterval(refreshDockerState, 5000);
refreshDockerState();

dockerContainerSubject.subscribe((dockerState) => {
	let proxyState = processContainerInformation(dockerState);
	let serializedState = JSON.stringify(proxyState);
	if(serializedState != previousProxyState) {
		console.log('configuration changed');
		previousProxyState = serializedState;
		proxyStateChangedSubject.onNext(proxyState);
	}
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

function processContainerInformation(dockerState) {
	let routes = [];
	dockerState.forEach((container) => {
		if(container.Labels["de.bfischerman.proxy-domain"]) {
			container.Ports.forEach((port) => {
				if(port.PrivatePort.toString() == container.Labels["de.bfischerman.proxy-port"]) {
					let route = {
						name: container.Id,
						domain: container.Labels["de.bfischerman.proxy-domain"],
						port: port.PublicPort.toString()
					};
					routes.push(route);
				}
			})	
		}
	});
	return {
		routes: routes
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

process.on('SIGINT', () => {
	process.exit(0);
})