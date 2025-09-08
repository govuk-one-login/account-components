export const getEnvironment = () =>
  (["dev", "build", "staging", "integration", "production"] as const).find(
    (env) => env === process.env["ENVIRONMENT"],
  ) ?? "local";
