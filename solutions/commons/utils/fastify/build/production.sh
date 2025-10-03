#!/bin/bash

set -e

sh ../commons/utils/fastify/build/shared.sh

tar cvf - src/static | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash.json

rolldown -c rolldown.config.ts

cp ./Makefile dist

cp ../../package.json ./dist/package.json
cp ../../package-lock.json ./dist/package-lock.json
cp ../../.npmrc ./dist/.npmrc

cd dist

npm ci --omit=dev