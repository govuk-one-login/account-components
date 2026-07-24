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
      reporter: ["lcov", "text"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
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
