# account-components

This repo contains the code for Account Components

## Set up and installation

- Copy `solutions/frontend/.env.sample` to `solutions/frontend/.env` and replace any placeholder values as appropriate
- Copy `solutions/stubs/.env.sample` to `solutions/stubs/.env` and replace any placeholder values as appropriate
- Copy `solutions/api/env.json.sample` to `solutions/api/env.json` and replace any placeholder values as appropriate
- Install [NVM](https://github.com/nvm-sh/nvm) or [FNM](https://github.com/Schniz/fnm) and select the correct Node version by running `nvm use` or `fnm use`
- Install Docker
- Install [Homebrew](https://brew.sh/)
- Install Brewfile dependencies with `npm run install-brewfile`
- Install NPM dependencies with `npm ci`
- Install Git Hooks with `npm run install-git-hooks`
- Run `cd solutions/integration-tests && npm ci` to install integration testing dependencies
- Run `npm run run:all` to start all the local servers and watch for changes. The frontend will be available at `http://localhost:6002`, the stubs at `http://localhost:6003` and the API at `http://localhost:6004`.

## Updating Node version

When updating the Node version you will need to update the following:

- `engines.node` field in all `package.json` files
- all `.nvmrc` files (the version should correspond to the lowest version which matches the `engines.node` field in the associated `package.json` file)
- Node version used by Lambda functions
- Node version used in Docker images
- ensure the base TSConfig installed as a development dependency in `package.json` and used in `tsconfig.json` corresponds with the Node version being used e.g. for Node 22 use the base TSConfig `@tsconfig/node22`
- ensure the major version of `@types/node` installed as a development dependency in `package.json` corresponds with the Node version being used
- where ESBuild is used (e.g. in Lambda `Metadata` in CloudFormation templates) ensure that the configured target matches the target in the base TSConfig e.g. the base TSConfig `@tsconfig/node22` sets a target of `es2022` and therefore the ESBuild target should be `es2022` too.

## Useful commands

There are various commands which can be run manually and which may also be run by Git hooks and in CI:

- `npm run run:all` to run the everything necessary to run the app locally and watch for changes
- `npm run run:frontend` to run the frontend locally and watch for changes
- `npm run build:frontend` to build the frontend
- `npm run run:stubs` to run the stubs locally and watch for changes
- `npm run build:stubs` to build the stubs
- `npm run run:api` to run the API locally and watch for changes
- `npm run build:api` to build the API
- `npm run build:core` to build core
- `npm run test` to run [Vitest](https://vitest.dev/) tests
- `npm run test:watch` to run [Vitest](https://vitest.dev/) tests in watch mode
- `npm run test:coverage` to run [Vitest](https://vitest.dev/) tests and report coverage
- `npm run check-types` to run [TypeScript](https://www.typescriptlang.org/) type checking
- `npm run format` to run [Prettier](https://prettier.io/) formatting
- `npm run eslint` to run [ESLint](https://eslint.org/)
- `npm run knip` to run [Knip](https://knip.dev/)
- `npm run tflint` to [lint Terraform](https://github.com/terraform-linters/tflint) files
- `npm run cfnlint` to [lint CloudFormation](https://github.com/aws-cloudformation/cfn-lint) templates with the file extension `.cf.yaml`
- `npm run sam-validate:frontend` to run [SAM validation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-validate.html) against the frontend CloudFormation template
- `npm run sam-validate:stubs` to run [SAM validation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-validate.html) against the stubs CloudFormation template
- `npm run sam-validate:core` to run [SAM validation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-validate.html) against the core CloudFormation template
- `npm run sam-validate:api` to run [SAM validation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-validate.html) against the API CloudFormation template
- `npm run check-gh-actions` to check GitHub Actions with [Zizmor](https://docs.zizmor.sh/)
- `npm run detect-secrets` to detect secrets which should not be in the repo. False positives can be [ignored with comments](https://github.com/Yelp/detect-secrets?tab=readme-ov-file#inline-allowlisting)
- `npm run config:validate` to validate the application's config

If these commands detect issues it may be possible to fix them by running:

- `npm run format:fix`
- `npm run eslint:fix`
- `npm run knip:fix`
- `npm run tflint:fix`
- `npm run cfnlint:fix`
- `npm run check-gh-actions:fix`

## Integration testing

See [Integration testing README](/solutions/integration-tests/README.md)
