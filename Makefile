.PHONY: all deps docker clean

GOPKG	:= proxy
GOBIN	:= proxy
GOSRC	:= $(wildcard ${GOPKG}/*.go)

all: docker

deps:
	go get -u github.com/opencontainers/runc/libcontainer/user
	go get -u github.com/docker/engine-api/client
	go get -u github.com/docker/engine-api/types
	go get -u golang.org/x/net/context

docker: ${GOPKG}/${GOBIN}
	docker build -t docker_proxy .

${GOPKG}/${GOBIN}: ${GOSRC}
	cd ${GOPKG} && GOOS=linux go build -o ${GOBIN}

clean:
	${RM} ${GOPKG}/${GOBIN}

run: docker
	docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock --net=host -e "HTTP_PORT=8080" -e "STATS_USER=admin" -e "STATS_PASS=secret" -e "STATS_PORT=9000" --name docker_proxy docker_proxy
