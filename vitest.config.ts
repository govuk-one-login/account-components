import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  test: {
    include: ["solutions/**/*.test.ts"],
    expect: {
      requireAssertions: true,
    },
    coverage: {
      include: [
        "solutions/frontend/src/**/*",
        "solutions/commons/**/*",
        "solutions/stubs/**/*",
      ],
      reporter: ["lcov", "text"],
    },
  },
});
