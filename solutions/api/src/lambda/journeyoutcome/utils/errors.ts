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
};

export type JourneyOutcomeAppError = AppError<
  keyof typeof journeyOutcomeErrors
>;

export const errorManager = new ErrorManager(journeyOutcomeErrors);
