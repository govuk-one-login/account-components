import { defineConfig } from "rolldown";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  input: "src/lambda.ts",
  platform: "node",
  external: ["fsevents"],
  output: {
    minify: true,
  },
});
