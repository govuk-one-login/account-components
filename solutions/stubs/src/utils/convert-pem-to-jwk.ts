import type { JWK } from "jose";
import { exportJWK, importSPKI } from "jose";
import type { JwksKeyType } from "../types/common.js";
import { logger } from "../../../commons/utils/logger/index.js";

export async function convertPemToJwk(
  pem: string,
  keyType: JwksKeyType,
): Promise<JWK> {
  try {
    const publicKey = await importSPKI(pem.trim(), keyType.alg);
    const jwk: JWK = await exportJWK(publicKey);
    jwk.kid = keyType.kid;
    return jwk;
  } catch (err) {
    logger.error("Error converting PEM to JWK:", { err });
    throw err;
  }
}
