#!/bin/bash

set -e

sh ../commons/utils/fastify/build/shared.sh

rolldown -c rolldown.config.ts

cp ./Makefile dist

cp ../../package.json ./dist/package.json
cp ../../package-lock.json ./dist/package-lock.json
cp ../../.npmrc ./dist/.npmrc

cd dist

npm ci --omit=dev