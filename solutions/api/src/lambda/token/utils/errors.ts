import type { AppError, ErrorType } from "../../../utils/common.js";
import { ErrorManager } from "../../../utils/common.js";

const tokenErrors: Record<string, ErrorType> = {
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
  invalidCode: {
    code: "E4003",
    description: "invalid_grant",
    statusCode: 400,
    metric: "InvalidAuthCode",
  },
};

export type TokenAppError = AppError<keyof typeof tokenErrors>;

export const errorManager = new ErrorManager(tokenErrors);
