import { errorManager } from "./errors.js";
import type { CryptoKey, JWTVerifyResult, JWTHeaderParameters } from "jose";
import {
  JWSSignatureVerificationFailed,
  JWTInvalid,
  JWTExpired,
} from "jose/errors";
import { jwtVerify, decodeJwt } from "jose";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/constants.js";
import type { JourneyInfoPayload } from "./validateJourneyOutcomeJwtClaims.js";
export async function verifySignatureAndGetPayload(
  token: string,
  key: CryptoKey,
): Promise<JourneyInfoPayload> {
  try {
    const { payload }: JWTVerifyResult<JourneyInfoPayload> = await jwtVerify(
      token,
      key,
      {
        algorithms: [jwtSigningAlgorithm],
      },
    );
    return payload;
  } catch (error) {
    if (error instanceof JWTInvalid) {
      errorManager.throwError(
        "InvalidAccessToken",
        `Access token is malformed or invalid`,
      );
    } else if (error instanceof JWSSignatureVerificationFailed) {
      const payload: JourneyInfoPayload = decodeJwt(token);
      const parts = token.split(".");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const header: JWTHeaderParameters = JSON.parse(
        Buffer.from(parts[0] ?? "", "base64").toString("utf-8"),
      );
      const jti: string = payload.jti ?? "Not found";
      const kid: string = header.kid ?? "Not found";
      errorManager.throwError(
        "AccessTokenSignatureInvalid",
        `Invalid access token signature with jti: ${jti} and kid: ${kid}`,
      );
    } else if (error instanceof JWTExpired) {
      errorManager.throwError("InvalidAccessToken", "Token has expired");
    } else {
      throw error;
    }
  }
  // Line below is unreachable. It's to appease TS
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {} as JourneyInfoPayload;
}
