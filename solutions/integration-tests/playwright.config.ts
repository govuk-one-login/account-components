import path from "node:path";
import type { PlaywrightTestConfig } from "@playwright/test";
import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddConfig } from "playwright-bdd";
import { env } from "./env.js";
import { getBaseUrl } from "./utils/getBaseUrl.js";

const testDir = defineBddConfig({
  features: "tests/features/**/*.feature",
  steps: "tests/steps/**/*.ts",
});

const webServers: PlaywrightTestConfig["webServer"] = [];

if (env.PRE_OR_POST_DEPLOY === "pre") {
  webServers.push({
    command: "npm run start-test-server",
    url: "http://localhost:8000",
    reuseExistingServer: true,
    timeout: 300000,
    name: "test-server",
    gracefulShutdown: { signal: "SIGTERM", timeout: 100000 },
    stderr: "pipe",
    stdout: "pipe",
  });
}

if (env.TEST_TARGET === "local") {
  webServers.push(
    {
      command: "npm run run:all",
      url: "http://localhost:6002/healthcheck",
      reuseExistingServer: true,
      timeout: 300000,
      name: "all-servers",
      gracefulShutdown: { signal: "SIGTERM", timeout: 30000 },
      stderr: "pipe",
      stdout: "pipe",
    },
    /*
    These are needed to check the stubs and API servers are running.
    These servers are started by `npm run run:all` run above but Playwright
    only supports checking one healthcheck URL per server object
    and we need to check the healthcheck URLs for the frontend, stubs
    and API servers.
    */
    {
      command: "sleep 310",
      url: "http://localhost:6003/healthcheck",
      reuseExistingServer: true,
      timeout: 300000,
      name: "stubs-server-healthcheck",
      gracefulShutdown: { signal: "SIGTERM", timeout: 30000 },
      stderr: "pipe",
      stdout: "pipe",
    },
    {
      command: "sleep 310",
      url: "http://localhost:6004/healthcheck",
      reuseExistingServer: true,
      timeout: 300000,
      name: "api-server-healthcheck",
      gracefulShutdown: { signal: "SIGTERM", timeout: 30000 },
      stderr: "pipe",
      stdout: "pipe",
    },
  );
}

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  testDir,
  forbidOnly: !env.HUMAN_IN_THE_LOOP,
  preserveOutput: env.HUMAN_IN_THE_LOOP ? "always" : "failures-only",
  workers: "50%",
  snapshotPathTemplate: `./${env.UPDATE_SNAPSHOTS ? "snapshots-updated" : "snapshots"}/{projectName}/{testFilePath}/{arg}{ext}`,
  reporter: env.TEST_REPORT_DIR
    ? [
        // See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3054010402/How+to+run+tests+against+your+deployed+application+in+a+SAM+deployment+pipeline#Test-reports
        cucumberReporter("json", {
          outputFile: path.join(env.TEST_REPORT_DIR, "report.json"),
        }),
      ]
    : "list",
  webServer: webServers,
  use: {
    baseURL: getBaseUrl(),
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
      },
    },
    {
      name: "Mobile",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
