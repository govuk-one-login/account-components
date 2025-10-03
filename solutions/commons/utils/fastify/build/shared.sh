#!/bin/bash

set -e

rm -rf dist

cp -r ./src ./dist

find dist -type f ! -name '*.njk' -print0 | xargs -0 rm -f

cp -r ./src/static dist

sass --load-path=../../node_modules/govuk-frontend/dist/govuk --load-path=../../node_modules/@govuk-one-login/frontend-ui/build --no-source-map dist/static/application.scss dist/static/application.css 

rm dist/static/application.scss

csso dist/static/application.css --output dist/static/application.css