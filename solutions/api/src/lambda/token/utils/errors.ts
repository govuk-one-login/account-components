import type { AppError, ErrorType } from "../../../utils/common.js";
import { ErrorManager } from "../../../utils/common.js";

const TokenError = "TokenError";

const tokenErrors: Record<string, ErrorType> = {
  invalidRequest: {
    code: "E4001",
    description: "invalid_request",
    statusCode: 400,
    metric: {
      type: TokenError,
      subType: "InvalidTokenRequest",
    },
  },
  invalidClientAssertion: {
    code: "E4002",
    description: "invalid_request",
    statusCode: 400,
    metric: {
      type: TokenError,
      subType: "InvalidClientAssertion",
    },
  },
  genericError: {
    code: "E500",
    description: "internal_server_error",
    statusCode: 500,
    metric: {
      type: TokenError,
      subType: "GenericError",
    },
  },
  invalidCode: {
    code: "E4003",
    description: "invalid_grant",
    statusCode: 400,
    metric: {
      type: TokenError,
      subType: "InvalidAuthCode",
    },
  },
};

export type TokenAppError = AppError<keyof typeof tokenErrors>;

export const errorManager = new ErrorManager(tokenErrors);
