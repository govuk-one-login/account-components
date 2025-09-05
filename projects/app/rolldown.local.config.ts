import { defineConfig } from "rolldown";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  input: "src/local.ts",
  platform: "node",
  external: ["fsevents"],
  output: {
    minify: true,
  },
});
