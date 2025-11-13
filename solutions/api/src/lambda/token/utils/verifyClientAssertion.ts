import type { JWTPayload } from "jose";
import { jwtVerify, decodeJwt, createRemoteJWKSet } from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";

export const verifyClientAssertion = async (
  clientAssertion: string,
): Promise<JWTPayload> => {
  const clientRegistry = await getClientRegistry();
  const decodedJwt = decodeJwt(clientAssertion);

  if (!decodedJwt.iss) {
    throw new Error("Missing iss in client assertion");
  }

  const client = clientRegistry.find((c) => {
    return c.client_id === decodedJwt.iss;
  });

  if (!client) {
    throw new Error(`Client ${decodedJwt.iss} not found for client assertion`);
  }

  const JWKS = createRemoteJWKSet(new URL(client.jwks_uri));
  const { payload } = await jwtVerify(clientAssertion, JWKS);

  return payload;
};
