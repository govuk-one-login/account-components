import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { createPublicKey } from "node:crypto";
import type { CryptoKey } from "jose";
import { importSPKI } from "jose";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/constants.js";

export async function getKMSKey(keyAlias: string): Promise<CryptoKey> {
  const kmsClient = getKmsClient();
  const publicKey = await kmsClient.getPublicKey({
    KeyId: keyAlias,
  });

  if (!publicKey.PublicKey) {
    throw new Error(`Public key data missing for KMS Key Alias: ${keyAlias}`);
  }

  const pem = createPublicKey({
    key: Buffer.from(publicKey.PublicKey),
    format: "der",
    type: "spki",
  })
    .export({
      format: "pem",
      type: "spki",
    })
    .toString();

  const key = await importSPKI(pem, jwtSigningAlgorithm);

  return key;
}
