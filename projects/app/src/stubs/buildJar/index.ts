import { CompactEncrypt } from "jose";
import { logger } from "../utils/logger.js";
import { JWKS_KEY_TYPES, SignatureTypes } from "../types/common.js";
import { convertPemToJwk } from "../utils/convert-pem-to-jwk.js";
import { getParametersProvider } from "../../utils/awsClient/index.js";

const getPublicKeyName = (keyType: SignatureTypes): string => {
  const keyEnvironment =
    keyType == SignatureTypes.EC
      ? "EC_PUBLIC_KEY_SSM_NAME"
      : "RSA_PUBLIC_KEY_SSM_NAME";

  const publicKey = process.env[keyEnvironment];
  if (!publicKey) {
    throw new Error(`Environment variable ${keyEnvironment} is not set`);
  }
  return publicKey;
};

export async function buildJar(signedJwt: string): Promise<string> {
  let publicKeyPem;
  try {
    publicKeyPem = await getParametersProvider().get(
      getPublicKeyName(SignatureTypes.RSA),
    );
  } catch (error) {
    logger.error(
      `Failed to retrieve ${SignatureTypes.RSA} public key from SSM`,
      { error },
    );
    throw new Error("Failed to retrieve key from SSM for param ");
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
