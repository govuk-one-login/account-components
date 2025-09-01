# account-components

This repo contains the code for Account Components

## Installation

Install [NVM](https://github.com/nvm-sh/nvm) or [FNM](https://github.com/Schniz/fnm) and select the correct Node version by running `nvm use` or `fnm use`.

Install [Homebrew](https://brew.sh/).

Install dependencies with `npm ci`.

## Updating Node version

When updating the Node version you will need to update the following:

- `engines.node` field in package.json
- .nvmrc
- .node-version
- Node version used by used by Lambda functions
- ensure the base TSConfig installed as a development dependency in package.json and used in tsconfig.json corresponds with the Node version being used e.g. for Node 22 use the base TSConfig `@tsconfig/node22`
- ensure the major version of `@types/node` installed as a development dependency in package.json corresponds with the Node version being used

## Useful commands

There are various commands which can be run manually and which may also be run by Git hooks and in CI:

- `npm run run:app` to run the app locally and watch for changes
- `npm run build:app` to build the app
- `generate-openapi:app` to generate OpenAPI documentation for the app
- `npm run format` to run [Prettier](https://prettier.io/) formatting
- `npm run eslint` to run [ESLint](https://eslint.org/)
- `npm run knip` to run [Knip](https://knip.dev/)
- `npm run tflint` to [lint Terraform](https://github.com/terraform-linters/tflint) files
- `npm run cflint` to [lint CloudFormation](https://github.com/aws-cloudformation/cfn-lint) templates with the file extension `.cf.yaml`
- `npm run sam-validate:app` to run [SAM validation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-validate.html) against the app's CloudFormation template
- `npm run check-gh-actions` to check GitHub Actions with [Zizmor](https://docs.zizmor.sh/)
- `npm run detect-secrets` to detect secrets which should not be in the repo. False positives can be [ignored with comments](https://github.com/Yelp/detect-secrets?tab=readme-ov-file#inline-allowlisting) or added to the baseline by running `npm run detect-secrets:update-baseline`

If these commands detect issues it may be possible to fix them by running:

- `npm run format:fix`
- `npm run eslint:fix`
- `npm run knip:fix`
- `npm run tflint:fix`
- `npm run cflint:fix`
- `npm run check-gh-actions:fix`
