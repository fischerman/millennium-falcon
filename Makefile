.PHONY: all docker clean

GOPKG	:= proxy
GOBIN	:= proxy
GOSRC	:= $(wildcard ${GOPKG}/*.go)

all: docker

docker: ${GOPKG}/${GOBIN}
	docker build -t docker_proxy .

${GOPKG}/${GOBIN}: ${GOSRC}
	cd ${GOPKG} && GOOS=linux go build -o ${GOBIN}

clean:
	${RM} ${GOPKG}/${GOBIN}

run: docker
	docker run --rm -it docker_proxy
