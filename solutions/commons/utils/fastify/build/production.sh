#!/bin/bash

set -e

bash ../commons/utils/fastify/build/shared.sh

# Create a hash of the src/static folder and write it
# into a JSON object in src/utils/static-hash.json
tar cvf - src/static | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash.json

# Create a hash of the node_modules/@simplewebauthn/browser/dist/bundle folder and write it
# into a JSON object in src/utils/static-hash-simplewebauthn-browser.json
tar cvf - node_modules/@simplewebauthn/browser/dist/bundle | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-simplewebauthn-browser.json

# Create a hash of the node_modules/govuk-frontend/dist/govuk/assets folder and write it
# into a JSON object in src/utils/static-hash-govuk-frontend-assets.json
tar cvf - node_modules/govuk-frontend/dist/govuk/assets | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-frontend-assets.json

# Create a hash of the node_modules/@govuk-one-login/frontend-analytics/lib folder and write it
# into a JSON object in src/utils/static-hash-govuk-one-login-frontend-analytics.json
tar cvf - node_modules/@govuk-one-login/frontend-analytics/lib | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-one-login-frontend-analytics.json

# Create a hash of the node_modules/govuk-frontend/dist/govuk folder and write it
# into a JSON object in src/utils/static-hash-govuk-frontend.json
tar cvf - node_modules/govuk-frontend/dist/govuk | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-frontend.json

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

cd ../
sam build