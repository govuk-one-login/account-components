import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  test: {
    include: ["solutions/**/*.test.ts"],
    expect: {
      requireAssertions: true,
    },
    coverage: {
      include: ["solutions/**/*.ts"],
      exclude: [
        "solutions/integration-tests/**",
        "solutions/frontend/rolldown.config.ts",
        "solutions/frontend/rolldown.local.config.ts",
        "solutions/frontend/src/local.ts",
        "solutions/frontend/src/lambda.ts",
        "solutions/frontend/src/index.ts",
      ],
      reporter: ["lcov", "text"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    server: {
      deps: {
        inline: [
          "@govuk-one-login/frontend-ui",
          "@govuk-one-login/event-catalogue-utils",
        ],
      },
    },
  },
});
