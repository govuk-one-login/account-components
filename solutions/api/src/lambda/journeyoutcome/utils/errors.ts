import type { AppError, ErrorType } from "../../../utils/common.js";
import { ErrorManager } from "../../../utils/common.js";

const journeyOutcomeErrors: Record<string, ErrorType> = {
  InvalidAuthorizationHeader: {
    code: "E4006",
    description: "invalid_request",
    statusCode: 400,
    metric: "InvalidAuthorizationHeader",
  },
  genericError: {
    code: "E500",
    description: "internal_server_error",
    statusCode: 500,
  },
  InvalidAccessToken: {
    code: "E4007",
    description: "invalid_request",
    statusCode: 400,
    metric: "InvalidAccessToken",
  },
  AccessTokenSignatureInvalid: {
    code: "E4008",
    description: "invalid_request",
    statusCode: 400,
    metric: "AccessTokenSignatureInvalid",
  },
};

export type JourneyOutcomeAppError = AppError<
  keyof typeof journeyOutcomeErrors
>;

export const errorManager = new ErrorManager(journeyOutcomeErrors);
