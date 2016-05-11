FROM haproxy:1.6.4-alpine
RUN apk --update add nodejs curl letsencrypt
RUN touch /haproxy.cfg
ADD src/package.json /src/
WORKDIR /src/
RUN npm install
ADD src/ /src/
CMD ["node", "/src/main.js"]