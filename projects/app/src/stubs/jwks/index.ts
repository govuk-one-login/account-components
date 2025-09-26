import type { JwksKeyType, RequestBody } from "../types/token.js";
import type { JsonWebKey } from "node:crypto";
import {
  getDefaultKeyValue,
  getPublicKeyName,
  getPercentageReturn4xx,
  getPercentageReturn5xx,
  getPercentageTimeout,
  getPercentageDelay,
  getMaximumDelayMilliseconds, getPrivateKeyName,
} from "../utils/app-config.js";
import {
  Algorithms,
  SignatureTypes,
  Kids,
  JWKS_TIMEOUT_MILLISECONDS,
  HttpCodesEnum, JWKS_KEY_TYPES,
} from "../types/common.js";
import logger from "../utils/logger.js";
import { CustomError } from "../utils/errors.js";

import { importSPKI, exportJWK } from "jose";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import {getLocalParameter, isLocalhost} from "../utils/get-parameter.js";


let cachedJwks: { keys: JsonWebKey[] };
const publicKeyMap = new Map<string, string>();

/**
 * JWKS handler. Builds or returns cached JWKS.
 */
export const buildJWK = async (requestBody: RequestBody): Promise<string> => {
  const error = await simulateError();
  if (error) return error;
  logger.info(`Cached JWKS: ${JSON.stringify(cachedJwks)}`);
  if (!cachedJwks || cachedJwks.keys.length <= 0) {
    logger.info("building JWKS");
    const jwks: { keys: JsonWebKey[] } = { keys: [] };

    const {signature, scenario} = getScenario(request.body as RequestBody);

    for (const keyType of JWKS_KEY_TYPES) {
      const { alg, kty, kid } = keyType;
      let publicKeyPem;
      if (!publicKeyMap.has(kid)) {
        try {
          if(isLocalhost()){
            logger.info("Running in Local mode, fetching parameters from local ssm");
            publicKeyPem = await getLocalParameter(getPublicKeyName(kty));
          } else {
            publicKeyPem = await getParameter(getPublicKeyName(kty));
          }

        } catch (error) {
          logger.error(
              `Failed to retrieve ${kty} private key from SSM`,
              {error},
          );
        }
        if (
          !publicKeyPem ||
          publicKeyPem.trim().length === 0 ||
          publicKeyPem === getDefaultKeyValue()
        ) {
          logger.error("Unable to retrieve public key");
          throw new CustomError(
            HttpCodesEnum.BAD_REQUEST,
            "Unable to retrieve public key",
          );
        }

        publicKeyMap.set(kid, publicKeyPem);
      }

      publicKeyPem = publicKeyMap.get(kid);
      if (!publicKeyPem) {
        logger.error("Unable to retrieve public key from cache");
        throw new CustomError(
          HttpCodesEnum.BAD_REQUEST,
          "Unable to retrieve public key from cache",
        );
      }
      const publicKeySpki = await importSPKI(publicKeyPem, alg);

      let publicJwk;
      try {
        publicJwk = await exportJWK(publicKeySpki);
      } catch (error) {
        logger.error(`Failed to export the ${kty} jwk`, { error });
        throw new CustomError(
          HttpCodesEnum.BAD_REQUEST,
          "Unable to export jwk",
        );
      }

      if (Object.keys(publicJwk).length > 0) {
        const key = { ...publicJwk, kid, alg, use: "sig" };
        jwks.keys.push(key);
      } else {
        logger.warn("Public key undefined, unable to add key to JWKS.");
      }

      if (jwks.keys.length > 0) {
        cachedJwks = jwks;
      }
    }
  } else {
    logger.info("returning cached JWKSs");
  }

  logger.debug(JSON.stringify(cachedJwks));
  const filteredKeys = cachedJwks.keys.filter((keyInfo) =>
    (keyInfo["kid"] as string).includes("Auth"),
  );

  if (filteredKeys.length > 0) {
    return JSON.stringify({
      statusCode: 200,
      body: JSON.stringify({ keys: filteredKeys }),
    });
  }

  return JSON.stringify({ statusCode: 500, body: JSON.stringify({}) });
};

/**
 * A function for simulating an error.
 */
async function simulateError(): Promise<string> {
  if (getPercentageReturn4xx() > Math.random()) {
    const statusCode = selectRandomItem([404, 400, 401, 403, 429]);
    logger.info("Intentionally returned error 400s from Mock JWKS.");
    return JSON.stringify({
      statusCode,
      body: JSON.stringify({
        message: "Intentionally returned error from Mock JWKS.",
      }),
    });
  }

  if (getPercentageReturn5xx() > Math.random()) {
    const statusCode = selectRandomItem([500, 501, 502]);
    logger.info("Intentionally returned error 500S from Mock JWKS.");
    return JSON.stringify({
      statusCode,
      body: JSON.stringify({
        message: "Intentionally returned a error from Mock JWKS.",
      }),
    });
  }

  if (getPercentageTimeout() > Math.random()) {
    logger.info("Intentionally returned a timeout error from Mock JWKS.");
    await wait(JWKS_TIMEOUT_MILLISECONDS);
    return JSON.stringify({
      statusCode: 408,
      body: JSON.stringify({
        message: `Intentionally returned a timeout error from Mock JWKS.`,
      }),
    });
  }

  if (getPercentageDelay() > Math.random()) {
    const maximumDelay = getMaximumDelayMilliseconds();
    const randomDelay = Math.floor(Math.random() * (maximumDelay + 1));
    logger.info(
      "Intentionally added a random delay of ${randomDelay} to the Mock JWKS",
    );
    await wait(randomDelay);
  }

  return "";
}

/**
 * A function for selecting a random item.
 *
 * @param array - numbers.
 * @returns - An array of randomised numbers.
 */
function selectRandomItem(array: number[]) {
  if (array.length === 0) {
    throw new Error("Cannot select a random item from an empty array.");
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * A function for delaying/ setting a time-out so the call back is called as close to the time specified.
 *
 * @param milliseconds - in numbers.
 * @returns - A promise when the callback is specified.
 */
async function wait(milliseconds: number) {
  return await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
