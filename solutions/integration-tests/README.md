# Integration tests

The integration tests are written with [Playwright](https://playwright.dev/) and [Playwright BDD](https://vitalets.github.io/playwright-bdd).

The `/solutions/integration-tests` directory should be treated as a separate solution. It should not import things from outside and other solutions should not import things from within the `/solutions/integration-tests` directory.

By default all tests are run against a desktop viewport and a mobile viewport.

## Authoring tests

When authoring tests try to stick to the Playwright best practices (https://playwright.dev/docs/best-practices).

Tests should be written in a BDD (business driven development) style from the context of a user. Try to avoid including technical details in steps.

Steps in files not prefixed with `@` are available to features up to the parent directory prefixed with `@`. If there is no parent directory prefixed with `@` then the steps will be available to all features. Try to scope steps as narrowly as possible.

## Running the tests locally

Tests are run on your local machine but control browsers running in a Docker container by utilising Playwright's server mode. Running the browsers in a container ensures consistent test results across different machines and architectures.

If using Docker Desktop on Mac or Windows you will need to `Enable host networking` in `Settings > Resources > Network`.

When running tests locally they are run against a locally running version of the frontend by default. Change the value of the environment variable `TEST_ENVIRONMENT` to one of `dev | build | staging | integration | production` to run tests against the corresponding deployment instead.

### Steps to run the tests:

Copy the file `/solutions/frontend/.env.integration-tests.sample` to `/solutions/frontend/.env.integration-tests` and replace any placeholder values as appropriate.

Copy the file `/solutions/stubs/.env.integration-tests.sample` to `/solutions/stubs/.env.integration-tests` and replace any placeholder values as appropriate.

Copy the file `/solutions/api/env.integration-tests.json.sample` to `/solutions/api/env.integration-tests.json` and replace any placeholder values as appropriate.

Copy the file `/solutions/integration-tests/.env.sample` to `/solutions/integration-tests/.env` and replace any placeholder values as appropriate.

To run the tests:

```bash
cd /solutions/integration-tests
npm run test
```

To run the tests in UI mode (when writing or changing tests UI mode is the best way to run and debug them):

```bash
cd /solutions/integration-tests
npm run test:ui
```

To run the tests and update snapshots (snapshots are only updated if all tests pass):

```bash
cd /solutions/integration-tests
npm run test:update-snapshots
```

Before running the tests these commands will start the test server in which the browsers will run (when `PRE_OR_POST_DEPLOY` is `pre`), and if `TEST_ENVIRONMENT` is `local` they will also start the necessary local servers. These servers are also stopped once the tests have run. Starting the servers can take some time. If you’re writing or updating tests and will need to frequently run them whilst doing so then prefer starting the servers manually:

To run the frontend:

```bash
cd /solutions/integration-tests
npm run run:frontend
```

To run the stubs:

```bash
cd /solutions/integration-tests
npm run run:stubs
```

To run the test server:

```bash
cd /solutions/integration-tests
npm run start-test-server
```

With the servers already running the tests will execute more quickly as they don't need to wait for the servers to start.

If you’re using the VS Code Playwright extension (prefer using UI mode where possible) then you can run watch mode to automatically update the tests as changes are made:

```
cd /solutions/integration-tests
npm run test:ui:watch
```

## Pre-deploy

By default the integration tests are run in GitHub Actions (see `.github/workflows/integration-tests.yaml`). This allows us to have confidence that things are working as expected before we merge and deploy changes.

When running in GitHub Actions the tests are run against local servers much like when running the tests locally. The environment variables for these local servers are configured in `.github/workflows/integration-tests.yaml`.

To skip a test in the pre-deployment environment tag the test with `@skipPreDeploy`.

## Post-deploy

Integration tests can also run in the frontend deployment pipeline once the frontend has been deployed. By default tests will not run in the post-deployment environment. To run a test in the post-deployment pipeline tag it with `@postDeploy`. Currently tests are run against the `build` deployment but can also be configured to run against other deployments e.g. `staging`.

Prefer running tests in GitHub Actions against local servers and only run tests which target actual deployments when it is not possible to test the functionality earlier.

## Test tagging

Tests can be tagged using the following custom tags to alter their behaviour:

- `@postDeploy` - will run in post-deployment environment
- `@skipPreDeploy` - will not run in pre-deployment environment
- `@skipMobile` - will not run against the mobile viewport
- `@skipDesktop` - will not run against the desktop viewport
- `@skipTarget-{target} e.g. @skipTarget-local, @skipTarget-build, @skipTarget-staging` - will not run when the test target matches `{target}`
- `@failMobile` - is expected to fail when run against the mobile viewport
- `@failDesktop` - is expected to fail when run against the desktop viewport
- `@failTarget-{target} e.g. @failTarget-local, @failTarget-build, @failTarget-staging` - is expected to fail when the test target matches `{target}`
- `@noJs` - will run against a browser with JavaScript disabled

There are also tags made available by Playwright BDD. See https://vitalets.github.io/playwright-bdd/#/writing-features/special-tags.
