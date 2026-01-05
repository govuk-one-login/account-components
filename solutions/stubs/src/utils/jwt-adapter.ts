import { Buffer } from "node:buffer";
import type { JWTPayload } from "jose";
import { base64url, importPKCS8, SignJWT } from "jose";
import type { JwtHeader } from "../types/common.js";
import { ALG, Algorithms, SignatureTypes } from "../types/common.js";
import { logger } from "../../../commons/utils/observability/index.js";
import { getParametersProvider } from "../../../commons/utils/awsClient/ssmClient/index.js";

const getPrivateKeyName = (keyType: SignatureTypes): string => {
  const keyEnvironment =
    keyType == SignatureTypes.EC
      ? "MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"
      : "MOCK_CLIENT_RSA_PRIVATE_KEY_SSM_NAME";

  const privateKey = process.env[keyEnvironment];
  if (!privateKey) {
    throw new Error(`Environment variable ${keyEnvironment} is not set`);
  }
  return privateKey;
};

export const getDefaultKeyValue = () => {
  return process.env["DEFAULT_SSM_VALUE"];
};

export class JwtAdapter {
  ALG = ALG;
  signingKeyMap = new Map<string, string>();

  async sign(
    jwtHeader: JwtHeader,
    jwtPayload: JWTPayload,
    signatureType: SignatureTypes,
  ): Promise<string> {
    if (
      jwtHeader.alg === Algorithms.NONE ||
      jwtHeader.alg === Algorithms.INVALID
    ) {
      logger.info("creating token without a signature.");
      const header = base64url.encode(Buffer.from(JSON.stringify(jwtHeader)));
      const payload = base64url.encode(Buffer.from(JSON.stringify(jwtPayload)));
      return `${header}.${payload}.`;
    }

    let privateKeyPem;
    if (!this.signingKeyMap.has(signatureType)) {
      const privateKeyName = getPrivateKeyName(signatureType);
      try {
        privateKeyPem = await getParametersProvider().get(privateKeyName);
      } catch (error) {
        logger.error(
          `Failed to retrieve ${signatureType} private key from SSM`,
          { error },
        );
        throw new Error(
          `Failed to retrieve key from SSM for param ${privateKeyName}`,
        );
      }

      if (
        !privateKeyPem ||
        privateKeyPem.trim().length === 0 ||
        privateKeyPem === getDefaultKeyValue()
      ) {
        logger.error("Unable to retrieve private key");
        throw new Error("Unable to retrieve private key");
      }
      this.signingKeyMap.set(signatureType, privateKeyPem);
    }

    privateKeyPem = this.signingKeyMap.get(signatureType);
    if (!privateKeyPem) {
      logger.error("Unable to retrieve private key from cache");
      throw new Error("Unable to retrieve private key from cache");
    }
    const algorithm =
      signatureType === SignatureTypes.EC ? Algorithms.EC : Algorithms.RSA;
    const privateKey = await importPKCS8(privateKeyPem, algorithm);

    let jwt;
    try {
      const unSignedJwt = new SignJWT(jwtPayload)
        .setProtectedHeader(jwtHeader)
        .setExpirationTime(jwtPayload.exp ?? 0);
      if (jwtPayload.aud) unSignedJwt.setAudience(jwtPayload.aud);
      if (jwtPayload.iss) unSignedJwt.setIssuer(jwtPayload.iss);
      jwt = await unSignedJwt.sign(privateKey);
    } catch (error) {
      logger.error("Failed to sign Jwt", { error });
      throw new Error("Failed to sign Jwt");
    }
    return jwt;
  }
}
