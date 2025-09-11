import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddConfig } from "playwright-bdd";
import { env } from "./env";
import { getBaseUrl } from "./utils/getBaseUrl";

const testDir = defineBddConfig({
  features: "tests/features/**/*.feature",
  steps: "tests/steps/**/*.ts",
});

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  testDir,
  forbidOnly: !env.HUMAN_IN_THE_LOOP,
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
  webServer:
    env.TEST_TARGET === "local"
      ? [
          {
            command: "npm run run:app",
            url: "http://localhost:6002/healthcheck",
            reuseExistingServer: true,
            timeout: 300000,
            name: "app-server",
            gracefulShutdown: { signal: "SIGTERM", timeout: 30000 },
          },
          {
            command: "npm run start-test-server",
            url: "http://localhost:8000",
            reuseExistingServer: true,
            timeout: 300000,
            name: "test-server",
            gracefulShutdown: { signal: "SIGTERM", timeout: 30000 },
          },
        ]
      : [],
  use: {
    baseURL: getBaseUrl(),
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
