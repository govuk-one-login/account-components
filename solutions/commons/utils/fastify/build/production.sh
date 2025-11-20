#!/bin/bash

set -e

bash ../commons/utils/fastify/build/shared.sh

# Create a hash of the src/static folder and write it
# into a JSON object in src/utils/static-hash.json
tar cvf - src/static | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash.json

# Bundle JavaScript
rolldown -c rolldown.config.ts

# Copy makefile requied by AWS SAM when packaging Lambdas
cp ./Makefile dist

# Copy the files necessary for installing production
# Node dependencies into dist
cp ../../package.json ./dist/package.json
cp ../../package-lock.json ./dist/package-lock.json
cp ../../.npmrc ./dist/.npmrc
cd dist
run custom-install --omit=dev

cd ../
sam build