export const resolveEnvVarToBool = (key: string) =>
  process.env[key] === "true" || process.env[key] === "1";
