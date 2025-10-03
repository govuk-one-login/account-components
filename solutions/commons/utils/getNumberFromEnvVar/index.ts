export const getNumberFromEnvVar = (
  key: string,
  defaultValue: number,
): number => {
  const value = process.env[key];
  if (value !== undefined) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new TypeError(`${key} is not a number`);
    }
    return parsed;
  }
  return defaultValue;
};
