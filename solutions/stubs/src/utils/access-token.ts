import { importJWK, SignJWT } from "jose";
import type { JWTHeaderParameters, JWTPayload } from "jose";

import type { RequestBody } from "../types/common.js";

const JWK_KEY_SECRET = {
  kty: "EC",
  d: "Ob4_qMu1nkkBLEw97u--PHVsShP3xOKOJ6z0WsdU0Xw", // pragma: allowlist secret
  use: "sig",
  crv: "P-256",
  kid: "B-QMUxdJOJ8ubkmArc4i1SGmfZnNNlM-va9h0HJ0jCo", // pragma: allowlist secret
  x: "YrTTzbuUwQhWyaj11w33k-K8bFydLfQssVqr8mx6AVE", // pragma: allowlist secret
  y: "8UQcw-6Wp0bp8iIIkRw8PW2RSSjmj1I_8euyKEDtWRk", // pragma: allowlist secret
  alg: "ES256",
};

const algorithm = "ES256";
const jwtHeader: JWTHeaderParameters = {
  kid: "B-QMUxdJOJ8ubkmArc4i1SGmfZnNNlM-va9h0HJ0jCo", // pragma: allowlist secret
  alg: algorithm,
};

const epochDateNow = (): number => Math.round(Date.now() / 1000);

const newClaims = (
  rpClientId: string,
  iss: string,
  randomString: string,
  nonce: string,
  expiry = 3600,
): JWTPayload => ({
  sub: `urn:fdc:gov.uk:2022:${randomString}`,
  iss: iss,
  aud: rpClientId,
  exp: epochDateNow() + expiry,
  iat: epochDateNow(),
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  sid: crypto.randomUUID(),
  nonce: nonce,
  vot: "Cl.Cm",
});

export const generateAccessToken = async (
  requestBody: RequestBody,
): Promise<string> => {
  const privateKey = await importJWK(JWK_KEY_SECRET, algorithm);
  return await new SignJWT(
    newClaims(
      requestBody.client_id,
      requestBody.iss,
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      crypto.randomUUID(),
      requestBody.jti,
      requestBody.exp ? parseInt(requestBody.exp, 10) : undefined,
    ),
  )
    .setProtectedHeader(jwtHeader)
    .sign(privateKey);
};
