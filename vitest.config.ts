import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  test: {
    include: ["projects/app/src/**/*.test.ts"],
    expect: {
      requireAssertions: true,
    },
    coverage: {
      include: ["projects/app/src/**/*"],
      reporter: ["lcov", "text"],
    },
  },
});
