#!/bin/bash

set -e

rm -rf dist

# Copy everything from src to dist then delete everything except
# nunjucks files. This is necessary because the nunjucks files
# need to be in the same nested folder structure as they are in
# src so that they can be found by path when render is called
cp -r ./src ./dist
find dist -type f ! -name '*.njk' -print0 | xargs -0 rm -f

# Copy static assets
cp -r ./src/static dist

# Compile and optimise CSS
sass --load-path=../../node_modules/govuk-frontend/dist/govuk --load-path=../../node_modules/@govuk-one-login/frontend-ui/build --no-source-map dist/static/application.scss dist/static/application.css 
rm dist/static/application.scss
csso dist/static/application.css --output dist/static/application.css

# Create a hash of the src/static folder and write it
# into a JSON object in src/utils/static-hash.json
if [[ ! -f src/utils/static-hash.json ]]; then
  tar cvf - src/static | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash.json
fi

# Create a hash of the node_modules/@simplewebauthn/browser/dist/bundle folder and write it
# into a JSON object in src/utils/static-hash-simplewebauthn-browser.json
if [[ ! -f src/utils/static-hash-simplewebauthn-browser.json ]]; then
  tar cvf - node_modules/@simplewebauthn/browser/dist/bundle | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-simplewebauthn-browser.json
fi

# Create a hash of the node_modules/govuk-frontend/dist/govuk/assets folder and write it
# into a JSON object in src/utils/static-hash-govuk-frontend-assets.json
if [[ ! -f src/utils/static-hash-govuk-frontend-assets.json ]]; then
  tar cvf - node_modules/govuk-frontend/dist/govuk/assets | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-frontend-assets.json
fi

# Create a hash of the node_modules/@govuk-one-login/frontend-analytics/lib folder and write it
# into a JSON object in src/utils/static-hash-govuk-one-login-frontend-analytics.json
if [[ ! -f src/utils/static-hash-govuk-one-login-frontend-analytics.json ]]; then
  tar cvf - node_modules/@govuk-one-login/frontend-analytics/lib | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-one-login-frontend-analytics.json
fi

# Create a hash of the node_modules/@govuk-one-login/frontend-device-intelligence/build/esm folder and write it
# into a JSON object in src/utils/static-hash-govuk-one-login-frontend-device-intelligence.json
if [[ ! -f src/utils/static-hash-govuk-one-login-frontend-device-intelligence.json ]]; then
  tar cvf - node_modules/@govuk-one-login/frontend-device-intelligence/build/esm | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-one-login-frontend-device-intelligence.json
fi

# Create a hash of the node_modules/govuk-frontend/dist/govuk folder and write it
# into a JSON object in src/utils/static-hash-govuk-frontend.json
if [[ ! -f src/utils/static-hash-govuk-frontend.json ]]; then
  tar cvf - node_modules/govuk-frontend/dist/govuk | sha1sum | head -c 40 | xargs -I X echo '{"hash":"X"}' > src/utils/static-hash-govuk-frontend.json
fi