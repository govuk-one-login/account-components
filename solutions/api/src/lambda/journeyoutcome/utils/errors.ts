import type { AppError, ErrorType } from "../../../utils/common.js";
import { ErrorManager } from "../../../utils/common.js";

const JourneyOutcomeError = "JourneyOutcomeError";

const journeyOutcomeErrors: Record<string, ErrorType> = {
  InvalidAuthorizationHeader: {
    code: "E4006",
    description: "invalid_request",
    statusCode: 400,
    metric: {
      type: JourneyOutcomeError,
      subType: "InvalidAuthorizationHeader",
    },
  },
  genericError: {
    code: "E500",
    description: "internal_server_error",
    statusCode: 500,
    metric: {
      type: JourneyOutcomeError,
      subType: "GenericError",
    },
  },
  FailedToFindOutcome: {
    code: "E5001",
    description: "internal_server_error",
    statusCode: 500,
    metric: {
      type: JourneyOutcomeError,
      subType: "FailedToFindOutcome",
    },
  },
  MissingOutcome: {
    code: "E404",
    description: "not_found",
    statusCode: 404,
    metric: {
      type: JourneyOutcomeError,
      subType: "MissingOutcome",
    },
  },
  OutcomeSubDoesNotMatchPayload: {
    code: "E4005",
    description: "invalid_request",
    statusCode: 400,
    metric: {
      type: JourneyOutcomeError,
      subType: "OutcomeSubDoesNotMatchPayload",
    },
  },
  InvalidAccessToken: {
    code: "E4007",
    description: "invalid_request",
    statusCode: 400,
    metric: {
      type: JourneyOutcomeError,
      subType: "InvalidAccessToken",
    },
  },
  AccessTokenSignatureInvalid: {
    code: "E4008",
    description: "invalid_request",
    statusCode: 400,
    metric: {
      type: JourneyOutcomeError,
      subType: "AccessTokenSignatureInvalid",
    },
  },
};

export type JourneyOutcomeAppError = AppError<
  keyof typeof journeyOutcomeErrors
>;

export const errorManager = new ErrorManager(journeyOutcomeErrors);
