import { logger } from "../../../commons/utils/logger/index.js";
import { metrics } from "../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

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

export interface AppError<K extends string | number | symbol> extends Error {
  code: K;
}

export interface TokenErrorType {
  code: string;
  description: string;
  statusCode: number;
  metric?: string;
}

export class ErrorManager<T extends Record<string, TokenErrorType>> {
  private readonly tokenErrors: T;

  constructor(tokenErrors: T) {
    this.tokenErrors = tokenErrors;
  }

  public throwError(
    type: keyof typeof this.tokenErrors,
    message: string,
  ): never {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const error: AppError<keyof T> = new Error(message) as AppError<keyof T>;
    error.code = type;
    throw error;
  }

  public isAppError(e: Error | AppError<keyof T>): boolean {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const appError = e as AppError<keyof T>;
    // Check if the code exists and is one of the keys in the provided tokenErrors
    return (
      appError.code &&
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      Object.keys(this.tokenErrors).includes(appError.code as string)
    );
  }

  public handleError(e: AppError<keyof T> | Error) {
    const error = this.isAppError(e)
      ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        this.tokenErrors[(e as AppError<keyof T>).code]
      : this.tokenErrors["genericError"];

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
}
