import assert from "node:assert";
import { throwError } from "./errors.js";

export const assertTokenRequest = (request: TokenRequest) => {
  try {
    assert(request.grant_type === "authorization_code", "Invalid grant_type");
    assert(request.code, "Missing code");
    assert(
      request.client_assertion_type ===
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      "Invalid client_assertion_type",
    );
    assert(request.client_assertion, "Missing client_assertion");
  } catch (e) {
    throwError("invalidRequest", (e as Error).message);
  }
};

export interface TokenRequest {
  grant_type: string;
  code: string;
  client_assertion_type: string;
  client_assertion: string;
}
