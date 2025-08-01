import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        functions: 90,
        branches: 90,
        lines: 90,
        statements: 90,
      },
      reporter: ["lcov", "text"],
    },
  },
});
