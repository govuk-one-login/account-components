const paths = {
  root: "/",
} as const;

export const getPath = (key: keyof typeof paths, withPrefix = false) => {
  const stubsPrefix = "/stubs";

  if (withPrefix) {
    return `${stubsPrefix}${paths[key]}`;
  }

  return paths[key];
};
