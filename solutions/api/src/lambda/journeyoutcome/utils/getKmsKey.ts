import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { createPublicKey } from "node:crypto";
import type { CryptoKey } from "jose";
import { importSPKI } from "jose";
import { jwtSigningAlgorithm } from "../../../../../commons/utils/constants.js";

const kmsKeyCache = new Map<string, CryptoKey>();

export async function getKMSKey(keyAlias: string): Promise<CryptoKey> {
  const cachedKey = kmsKeyCache.get(keyAlias);
  if (cachedKey !== undefined) {
    return cachedKey;
  }

  const kmsClient = getKmsClient();
  const publicKeyResponse = await kmsClient.getPublicKey({ KeyId: keyAlias });

  if (!publicKeyResponse.PublicKey) {
    throw new Error(`Public key data missing for KMS Key Alias: ${keyAlias}`);
  }

  const pem = createPublicKey({
    key: Buffer.from(publicKeyResponse.PublicKey),
    format: "der",
    type: "spki",
  })
    .export({ format: "pem", type: "spki" })
    .toString();

  const key = await importSPKI(pem, jwtSigningAlgorithm);
  kmsKeyCache.set(keyAlias, key);
  return key;
}
