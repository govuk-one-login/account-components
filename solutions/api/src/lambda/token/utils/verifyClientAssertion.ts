import type { JWTPayload } from "jose";
import { jwtVerify, decodeJwt, createRemoteJWKSet } from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import { errorManager } from "./errors.js";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/constants.js";
import assert from "node:assert";

export const verifyClientAssertion = async (
  clientAssertion: string,
): Promise<JWTPayload> => {
  const clientRegistry = await getClientRegistry();
  const decodedJwt = decodeJwt(clientAssertion);
  const { iss, iat, aud } = decodedJwt;

  assert(
    process.env["TOKEN_ENDPOINT_URL"],
    "TOKEN_ENDPOINT_URL is not defined",
  );
  const tokenEndpointUrl = process.env["TOKEN_ENDPOINT_URL"];

  if (!iss) {
    errorManager.throwError(
      "invalidClientAssertion",
      "Missing iss in client assertion",
    );
  }

  if (!iat) {
    return errorManager.throwError(
      "invalidClientAssertion",
      `Missing iat in client assertion, iss=${String(iss)}`,
    );
  }

  if (iat * 1000 > Date.now()) {
    errorManager.throwError(
      "invalidClientAssertion",
      `Client assertion iat is in the future, iss=${String(iss)}`,
    );
  }

  if (!aud) {
    return errorManager.throwError(
      "invalidClientAssertion",
      `Missing aud in client assertion, iss=${String(iss)}`,
    );
  }

  const audList = Array.isArray(aud) ? aud : [aud];
  if (!audList.includes(tokenEndpointUrl)) {
    return errorManager.throwError(
      "invalidClientAssertion",
      `Invalid aud in client assertion: ${audList.join(", ")} for iss=${String(iss)}`,
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
    const { payload } = await jwtVerify(clientAssertion, JWKS, {
      algorithms: [jwtSigningAlgorithm],
    });

    return payload;
  } catch (e) {
    errorManager.throwError(
      "invalidClientAssertion",
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      `Failed to verify client assertion for iss=${String(iss)}: ${(e as Error).message}`,
    );
  }

  throw new Error(
    "This should be unreachable if errorManager.throwError works as intended",
  );
};
