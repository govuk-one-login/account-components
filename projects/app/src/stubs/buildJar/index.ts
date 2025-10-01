import { CompactEncrypt } from "jose";
import logger from "../utils/logger.js";
import { getPublicKeyName } from "../utils/app-config.js";
import { JWKS_KEY_TYPES, SignatureTypes } from "../types/common.js";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import { getLocalParameter, isLocalhost } from "../utils/get-parameter.js";
import { convertPemToJwk } from "../utils/convert-pem-to-jwk.js";

export async function buildJar(signedJwt: string): Promise<string> {
  let publicKeyPem;
  try {
    if (isLocalhost()) {
      logger.info(
        "Running in Local mode, fetching public key from local stack",
      );
      publicKeyPem = await getLocalParameter(
        getPublicKeyName(SignatureTypes.RSA),
      );
    } else {
      publicKeyPem = await getParameter(getPublicKeyName(SignatureTypes.RSA));
    }
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
