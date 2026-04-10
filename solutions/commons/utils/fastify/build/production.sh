#!/bin/bash

set -e

bash ../commons/utils/fastify/build/shared.sh

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
npm ci --omit=dev