import assert from "node:assert";
import { randomUUID } from "node:crypto";

import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/constants.js";
import type { AuthRequestT } from "./getAuthRequest.js";
import { derToJose } from "ecdsa-sig-formatter";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";

export const createAccessToken = async (authRequest: AuthRequestT) => {
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
  assert(process.env["AUTH_TABLE_NAME"], "AUTH_TABLE_NAME is not configured");

  const keyAlias = process.env["JWT_SIGNING_KEY_ALIAS"];
  const audience = process.env["JOURNEY_OUTCOME_ENDPOINT_URL"];
  const issuer = process.env["TOKEN_ENDPOINT_URL"];
  const authTableName = process.env["AUTH_TABLE_NAME"];

  const kmsClient = getKmsClient();
  const ddbClient = getDynamoDbClient();

  const keyId = (
    await kmsClient.describeKey({
      KeyId: keyAlias,
    })
  ).KeyMetadata?.KeyId;

  const { Item: AuthCodeItem } = await ddbClient.get({
    TableName: authTableName,
    Key: { code: authRequest.code },
    ConsistentRead: true,
  });

  assert(
    AuthCodeItem?.["sub"],
    `Auth request subject not found for code: ${authRequest.code}`,
  );

  const header = {
    alg: jwtSigningAlgorithm,
    typ: "JWT",
    kid: keyId,
  };

  const claims = {
    outcome_id: authRequest.outcome_id,
    iss: issuer,
    sub: String(AuthCodeItem["sub"]),
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
    SigningAlgorithm: "ECDSA_SHA_256",
    MessageType: "RAW",
  });

  assert(Signature, "KMS sign response did not include a signature");
  const signature = derToJose(Buffer.from(Signature), jwtSigningAlgorithm);

  return `${unsignedToken}.${signature}`;
};
