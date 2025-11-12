import type { ErrorObject, ErrorObjectKey } from "../../../utils/common.js";

export const Errors: Record<ErrorObjectKey, ErrorObject> = {
  invalidRequest: {
    description: "E4006",
    type: "invalid_request",
  },
};
