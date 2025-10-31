import { CompactEncrypt } from "jose";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { JWKS_KEY_TYPES, SignatureTypes } from "../../../types/common.js";
import { convertPemToJwk } from "../../../utils/convert-pem-to-jwk.js";
import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { createPublicKey } from "node:crypto";

const getPublicKeyKmsAliasName = (keyType: SignatureTypes): string => {
  const keyEnvironment =
    keyType == SignatureTypes.EC
      ? "JAR_EC_ENCRYPTION_KEY_ALIAS"
      : "JAR_RSA_ENCRYPTION_KEY_ALIAS";

  const publicKey = process.env[keyEnvironment];
  if (!publicKey) {
    throw new Error(`Environment variable ${keyEnvironment} is not set`);
  }
  return publicKey;
};

export async function buildJar(signedJwt: string): Promise<string> {
  let publicKeyPem: string;
  try {
    const publicKey = await getKmsClient().getPublicKey({
      KeyId: getPublicKeyKmsAliasName(SignatureTypes.RSA),
    });

    if (!publicKey.PublicKey) {
      throw new Error("Public key data is missing from KMS response");
    }

    publicKeyPem = createPublicKey({
      key: Buffer.from(publicKey.PublicKey),
      format: "der",
      type: "spki",
    })
      .export({
        format: "pem",
        type: "spki",
      })
      .toString();
  } catch (error) {
    logger.error(
      `Failed to retrieve ${SignatureTypes.RSA} public key from KMS`,
      { error },
    );
    throw new Error("Failed to retrieve key from KMS");
  }

  if (!publicKeyPem) {
    throw new Error("Public key PEM is empty");
  }

  const keyType = JWKS_KEY_TYPES.find((kt) => kt.kty === SignatureTypes.RSA);
  if (!keyType) {
    throw new Error(`Unsupported signature type: ${SignatureTypes.RSA}`);
  }

  const jwk = await convertPemToJwk(publicKeyPem, keyType);

  const encryptedJwt = await new CompactEncrypt(
    new TextEncoder().encode(signedJwt),
  )
    .setProtectedHeader({
      alg: keyType.jweAlg,
      enc: "A256GCM",
      kid: keyType.kid,
    })
    .encrypt(jwk);

  logger.info("Successfully build jar ");
  return encryptedJwt;
}
