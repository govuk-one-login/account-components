import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

export type AppError = Error & { code: keyof typeof tokenErrors };

interface TokenErrorType {
  code: string;
  description: string;
  statusCode: number;
  metric?: string;
}

const tokenErrors: Record<string, TokenErrorType> = {
  invalidRequest: {
    code: "E4001",
    description: "invalid_request",
    statusCode: 400,
    metric: "InvalidTokenRequest",
  },
  invalidClientAssertion: {
    code: "E4002",
    description: "invalid_request",
    statusCode: 400,
    metric: "InvalidClientAssertion",
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
  const error = tokenErrors[e.code] ?? tokenErrors["genericError"];

  if (!error) {
    //should not need this, but to satisfy typescript
    throw new Error("Unhandled error type");
  }

  logger.warn("Invalid Request", {
    error,
  });
  if (error.metric) {
    metrics.addMetric(error.metric, MetricUnit.Count, 1);
  }

  return {
    statusCode: error.statusCode,
    body: JSON.stringify({
      error: error.description,
      error_description: error.code,
    }),
  };
}
