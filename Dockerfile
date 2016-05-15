FROM alpine:edge

RUN apk --no-cache --update add haproxy

COPY proxy/proxy /usr/local/bin/proxy

# CMD for now so we can easily overwrite
# ENTRYPOINT ["proxy"]
CMD ["proxy"]
