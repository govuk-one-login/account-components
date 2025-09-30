import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  test: {
    include: [
      "solutions/frontend/src/**/*.test.ts",
      "solutions/stubs/src/**/*.test.ts",
    ],
    expect: {
      requireAssertions: true,
    },
    coverage: {
      include: ["solutions/frontend/src/**/*", "solutions/stubs/src/**/*"],
      reporter: ["lcov", "text"],
    },
  },
});
