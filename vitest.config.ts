import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  test: {
    expect: {
      requireAssertions: true,
    },
    coverage: {
      reporter: ["lcov", "text"],
    },
  },
});
