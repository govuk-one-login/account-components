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