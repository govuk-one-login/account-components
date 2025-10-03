#!/bin/bash

set -e

sh ../commons/utils/fastify/build/shared.sh

rolldown -c rolldown.local.config.ts

ln -s "${PWD}/../../node_modules" ./dist/node_modules