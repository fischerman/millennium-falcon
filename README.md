# Millennium Falcon 

This container listens on the Docker socket and configures an HAProxy based on labels attached to the containers.

Supports HTTP(S)

Run like so
```
sudo docker run -v /var/run/docker.sock:/var/run/docker.sock --net=host fischerman/millennium-falcon
```