import { importJWK, SignJWT } from "jose";
import type { JWTHeaderParameters } from "jose";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert";

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
const privateKey = await importJWK(JWK_KEY_SECRET, algorithm);
const jwtHeader: JWTHeaderParameters = {
  kid: JWK_KEY_SECRET.kid,
  alg: algorithm,
};
const epochDateNow = (): number => Math.floor(Date.now() / 1000);

const tokenBody = (extraClaims?: Record<string, unknown>) => {
  assert(process.env["ACCESS_TOKEN_ISSUER"], "ACCESS_TOKEN_ISSUER is not set");

  return {
    sub: `urn:fdc:gov.uk:2022:${randomUUID()}`,
    public_sub: randomUUID(),
    iss: process.env["ACCESS_TOKEN_ISSUER"],
    aud: `${Buffer.from(randomBytes(5)).toString("hex")}-${Buffer.from(randomBytes(5)).toString("hex")}-${Buffer.from(randomBytes(5)).toString("hex")}`,
    iat: epochDateNow(),
    exp: epochDateNow() + 600,
    sid: randomUUID(),
    nonce: `${Buffer.from(randomBytes(5)).toString("hex")}-${Buffer.from(randomBytes(5)).toString("hex")}`,
    vot: "Cl.Cm",
    ...extraClaims,
  };
};

export const generateAccessToken = async (
  extraClaims?: Record<string, unknown>,
): Promise<string> => {
  return await new SignJWT(tokenBody(extraClaims))
    .setProtectedHeader(jwtHeader)
    .sign(privateKey);
};
