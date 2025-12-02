import assert from "node:assert";
import { randomUUID } from "node:crypto";
import type { JWTPayload } from "jose";

import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import {
  jwtSigningAlgorithm,
  kmsJwtSigningAlgorithm,
} from "../../../../../commons/utils/constants.js";
import type { AuthRequestT } from "./getAuthRequest.js";
import { derToJose } from "ecdsa-sig-formatter";

export const createAccessToken = async (
  assertion: JWTPayload,
  authRequest: AuthRequestT,
) => {
  assert(
    process.env["TOKEN_ENDPOINT_URL"],
    "TOKEN_ENDPOINT_URL is not configured",
  );
  assert(
    process.env["JOURNEY_OUTCOME_ENDPOINT_URL"],
    "JOURNEY_OUTCOME_ENDPOINT_URL is not configured",
  );
  assert(
    process.env["JWT_SIGNING_KEY_ALIAS"],
    "JWT_SIGNING_KEY_ALIAS is not configured",
  );

  const keyAlias = process.env["JWT_SIGNING_KEY_ALIAS"];
  const audience = process.env["JOURNEY_OUTCOME_ENDPOINT_URL"];
  const issuer = process.env["TOKEN_ENDPOINT_URL"];

  const kmsClient = getKmsClient();

  const keyId = (
    await kmsClient.describeKey({
      KeyId: keyAlias,
    })
  ).KeyMetadata?.KeyId;

  const header = {
    alg: jwtSigningAlgorithm,
    typ: "JWT",
    kid: keyId,
  };

  const claims = {
    outcome_id: authRequest.outcome_id,
    iss: issuer,
    sub: assertion.sub,
    aud: audience,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
    jti: randomUUID(),
  };

  const headerBase64 = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const claimsBase64 = Buffer.from(JSON.stringify(claims)).toString(
    "base64url",
  );
  const unsignedToken = `${headerBase64}.${claimsBase64}`;

  const { Signature } = await kmsClient.sign({
    KeyId: keyId,
    Message: Buffer.from(unsignedToken),
    SigningAlgorithm: kmsJwtSigningAlgorithm,
    MessageType: "RAW",
  });

  assert(Signature, "KMS sign response did not include a signature");
  const signature = derToJose(Buffer.from(Signature), jwtSigningAlgorithm);

  return `${unsignedToken}.${signature}`;
};
