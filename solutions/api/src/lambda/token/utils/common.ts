export const tokenErrors = {
  invalidRequest: {
    description: "E4001",
    type: "invalid_request",
  },
};

export const getErrorResponse = (errorKey: keyof typeof tokenErrors) => {
  const error = tokenErrors[errorKey];
  return {
    statusCode: 400,
    body: JSON.stringify({
      error: error.type,
      error_description: error.description,
    }),
  };
};
