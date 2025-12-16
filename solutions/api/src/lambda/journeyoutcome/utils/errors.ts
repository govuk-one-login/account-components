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
  FailedToFindOutcome: {
    code: "E500",
    description: "internal_server_error",
    statusCode: 500,
    metric: "FailedToFindOutcome",
  },
  MissingOutcome: {
    code: "E404",
    description: "not_found",
    statusCode: 404,
    metric: "MissingOutcome",
  },
  OutcomeSubDoesNotMatchPayload: {
    code: "E4005",
    description: "invalid_request",
    statusCode: 400,
    metric: "OutcomeSubDoesNotMatchPayload",
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
