type ErrorCode = `E${number}`;

export interface ErrorObject {
  description: ErrorCode;
  type: string;
}

export type ErrorObjectKey = "invalidRequest";

export const getHeader = (
  headers: Record<string, string | undefined>,
  key: string,
): string | undefined => {
  const lowerKey = key.toLowerCase();
  for (const headerKey of Object.keys(headers)) {
    if (headerKey.toLowerCase() === lowerKey) {
      return headers[headerKey];
    }
  }
  return undefined;
};

export const getErrorResponse = (error: ErrorObject) => {
  return {
    statusCode: 400,
    body: JSON.stringify({
      error: error.type,
      error_description: error.description,
    }),
  };
};
