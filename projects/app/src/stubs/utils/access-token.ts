import { v4 as uuid } from "uuid";
import { importJWK, SignJWT } from "jose";
import type { CryptoKey, JWK, JWTHeaderParameters, JWTPayload } from "jose";
import type { RequestBody } from "../types/token.js";

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
let cachedPrivateKey: Uint8Array | CryptoKey;
const getPrivateKey = async () => {
  if (
    typeof JWK_KEY_SECRET === // pragma: allowlist secret
    "undefined"
  ) {
    throw new Error("JWK_KEY_SECRET environment variable is undefined");
  }
  const jwk: JWK = JWK_KEY_SECRET;
  cachedPrivateKey = await importJWK(jwk, algorithm);
  return cachedPrivateKey;
};
await getPrivateKey(); //populate cache on runtime

const epochDateNow = (): number => Math.round(Date.now() / 1000);

const newClaims = (
  rpClientId: string,
  iss: string,
  randomString: string,
  nonce: string,
): JWTPayload => ({
  sub: `urn:fdc:gov.uk:2022:${randomString}`,
  iss: iss,
  aud: rpClientId,
  exp: epochDateNow() + 3600,
  iat: epochDateNow(),
  sid: uuid(),
  nonce: nonce,
  vot: "Cl.Cm",
});

export const generateAccessToken = async (
  requestBody: RequestBody,
): Promise<string> => {
  const privateKey = await getPrivateKey();
  return await new SignJWT(
    newClaims(requestBody.client_id, requestBody.iss, uuid(), requestBody.jti),
  )
    .setProtectedHeader(jwtHeader)
    .sign(privateKey);
};
