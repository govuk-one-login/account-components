import { CompactEncrypt, importSPKI } from "jose";
import { getKmsClient } from "../../../../../commons/utils/awsClient/index.js";
import { createPublicKey } from "node:crypto";
import assert from "node:assert";
import {
  jarContentEncryptionAlgorithm,
  jarKeyEncryptionAlgorithm,
} from "../../../../../commons/utils/contstants.js";

let keyId: string | undefined = undefined;

export async function buildJar(signedJwt: string): Promise<string> {
  assert.ok(
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
    "JAR_RSA_ENCRYPTION_KEY_ALIAS is not set",
  );

  const kmsClient = await getKmsClient();
  const publicKey = await kmsClient.getPublicKey({
    KeyId: process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
  });

  if (!publicKey.PublicKey) {
    throw new Error("Public key data is missing from KMS response");
  }

  const publicKeyPem = createPublicKey({
    key: Buffer.from(publicKey.PublicKey),
    format: "der",
    type: "spki",
  })
    .export({
      format: "pem",
      type: "spki",
    })
    .toString();

  keyId ??= (
    await kmsClient.describeKey({
      KeyId: process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
    })
  ).KeyMetadata?.KeyId;

  assert.ok(keyId, "Failed to get keyId for JAR_RSA_ENCRYPTION_KEY_ALIAS");

  const jwk = await importSPKI(publicKeyPem, jarKeyEncryptionAlgorithm);

  const encryptedJwt = await new CompactEncrypt(
    new TextEncoder().encode(signedJwt),
  )
    .setProtectedHeader({
      alg: jarKeyEncryptionAlgorithm,
      enc: jarContentEncryptionAlgorithm,
      kid: keyId,
    })
    .encrypt(jwk);

  return encryptedJwt;
}
