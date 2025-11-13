import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

export type AppError = Error & { code: keyof typeof tokenErrors };

const tokenErrors = {
  invalidRequest: {
    code: "E4001",
    description: "invalid_request",
    statusCode: 400,
  },
  invalidClientAssertion: {
    code: "E4002",
    description: "invalid_request",
    statusCode: 400,
  },
  genericError: {
    code: "E500",
    description: "internal_server_error",
    statusCode: 500,
  },
};

export function throwError(
  type: keyof typeof tokenErrors,
  message: string,
): never {
  const error: AppError = new Error(message) as AppError;
  error.code = type;
  throw error;
}

export function handleError(e: AppError) {
  const error = tokenErrors[e.code];

  logger.warn("Invalid Request", {
    error,
  });
  metrics.addMetric("InvalidTokenRequest", MetricUnit.Count, 1);

  return {
    statusCode: error.statusCode,
    body: JSON.stringify({
      error: error.description,
      error_description: error.code,
    }),
  };
}
