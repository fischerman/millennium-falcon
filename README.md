# Millennium Falcon 

This container listens on the Docker socket and configures an HAProxy based on labels attached to the containers.

Supports HTTP(S) and TCP

Run like so
```
sudo docker run -v /var/run/docker.sock:/var/run/docker.sock --net=host fischerman/millennium-falcon
```

## Environment variables

- `HTTP_PORT`: The HTTP port HAProxy binds to. Set to `disable` to not use HTTP backend. Default is `80`.
- `HTTPS_PORT`: The HTTPS port HAProxy binds to. Set to `disable` to not use HTTPS backend. Default is `443`.
- `STATS_USER`: The stats username. Default is `admin`.
- `STATS_PASS`: The password for the stats page. If not set, stats are disabled.

## Container Labels

- `de.bfischerman.proxy-mode`: `tcp` or `http`

### `tcp` Mode

- `de.bfischerman.proxy-source`: The port HAProxy binds to
- `de.bfischerman.proxy-target`: The private port of the container. It will be translated to the public port.

### `http` Mode

- `de.bfischerman.proxy-url`: Domain + Path, e.g. `example.com/service`. Used by HAProxy to generate `use_backend`-statements. The domain as well as the path must match. Required. Only domain OR path is required.
- `de.bfischerman.proxy-protocol`: Can be `http`, `https` or `both`. Default is `http`. Optional
- `de.bfischerman.proxy-redirect-http`: Redirect http traffic to https. Can be `true` or `false`. Default is `false`. Optional.
- `de.bfischerman.port`: The private port to redirect to
- `de.bfischerman.options`: TBA
- `de.bfischerman.letsencrypt`: TBA