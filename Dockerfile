# unexpected-fs does not support node >= 8
FROM node:6 

WORKDIR /usr/src/app

COPY . .
