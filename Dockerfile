# unexpected-fs does not support node >= 8
FROM node:8-alpine

WORKDIR /usr/src/app

COPY . .
