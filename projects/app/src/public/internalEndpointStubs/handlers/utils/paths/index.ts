const paths = {
  requestObjectGenerator: "/generate-request-object",
} as const;

export const getPath = (key: keyof typeof paths, withPrefix = false) => {
  const prefix = "/stubs/internal-endpoints";

  if (withPrefix) {
    return `${prefix}${paths[key]}`;
  }

  return paths[key];
};
