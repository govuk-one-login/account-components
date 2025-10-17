import { defineConfig } from "rolldown";

// eslint-disable-next-line no-restricted-exports
export default defineConfig({
  input: "src/local.ts",
  platform: "node",
  // @aws-sdk/client-appconfigdata has to be excluded from the bundle as at the
  // time of writing it causes rolldown to crash
  external: ["fsevents", "@aws-sdk/client-appconfigdata"],
  output: {
    minify: true,
    sourcemap: true,
  },
});
