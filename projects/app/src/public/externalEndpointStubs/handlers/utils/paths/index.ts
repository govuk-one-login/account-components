const paths = {
  configure: "/configure",
} as const;

export const getPath = (key: keyof typeof paths, withPrefix = false) => {
  const prefix = "/stubs/external-endpoints";

  if (withPrefix) {
    return `${prefix}${paths[key]}`;
  }

  return paths[key];
};
