export const getNumberFromEnvVar = (
  key: string,
  defaultValue: number,
): number => {
  const value = process.env[key];
  if (value !== undefined) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`${key} is not a number`);
    }
    return parsed;
  }
  return defaultValue;
};
