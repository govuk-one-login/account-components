export interface ExpectedError extends Error {
  code: `EXPECTED_ERROR_${string}`;
  statusCode?: number;
}

export const isExpectedError = (error: unknown): error is ExpectedError =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string" &&
  error.code.startsWith("EXPECTED_ERROR_");
