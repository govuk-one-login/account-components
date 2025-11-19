import type { JWTPayload } from "jose";
import { jwtVerify, decodeJwt, createRemoteJWKSet } from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import { errorManager } from "./errors.js";

export const verifyClientAssertion = async (
  clientAssertion: string,
): Promise<JWTPayload> => {
  const clientRegistry = await getClientRegistry();
  const decodedJwt = decodeJwt(clientAssertion);
  const iss = decodedJwt.iss;

  if (!iss) {
    errorManager.throwError(
      "invalidClientAssertion",
      "Missing iss in client assertion",
    );
  }

  const client = clientRegistry.find((c) => {
    return c.client_id === iss;
  });

  if (!client) {
    errorManager.throwError(
      "invalidClientAssertion",
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Client ${iss} not found for client assertion`,
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const JWKS = createRemoteJWKSet(new URL(client!.jwks_uri));
    const { payload } = await jwtVerify(clientAssertion, JWKS);

    return payload;
  } catch (e) {
    errorManager.throwError(
      "invalidClientAssertion",
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      `Failed to verify client assertion: ${(e as Error).message}`,
    );
  }

  throw new Error(
    "This should be unreachable if errorManager.throwError works as intended",
  );
};
