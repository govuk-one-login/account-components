import type { JWTPayload } from "jose";
import { jwtVerify, decodeJwt, createRemoteJWKSet } from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import { throwError } from "./errors.js";

export const verifyClientAssertion = async (
  clientAssertion: string,
): Promise<JWTPayload> => {
  const clientRegistry = await getClientRegistry();
  const decodedJwt = decodeJwt(clientAssertion);

  if (!decodedJwt.iss) {
    throwError("invalidClientAssertion", "Missing iss in client assertion");
  }

  const client = clientRegistry.find((c) => {
    return c.client_id === decodedJwt.iss;
  });

  if (!client) {
    throwError(
      "invalidClientAssertion",
      `Client ${decodedJwt.iss} not found for client assertion`,
    );
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(client.jwks_uri));
    const { payload } = await jwtVerify(clientAssertion, JWKS);

    return payload;
  } catch (e) {
    throwError(
      "invalidClientAssertion",
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      `Failed to verify client assertion: ${(e as Error).message}`,
    );
  }
};
