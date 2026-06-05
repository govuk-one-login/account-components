import type { JWTPayload } from "jose";
import {
  jwtVerify,
  decodeJwt,
  createRemoteJWKSet,
  decodeProtectedHeader,
} from "jose";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import { errorManager } from "./errors.js";
import assert from "node:assert";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";
import { getEnvironment } from "../../../../../commons/utils/getEnvironment/index.js";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { jwtVerifyAlgorithms } from "../../../../../commons/utils/constants.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

export const verifyClientAssertion = async (
  clientAssertion: string,
  apiBaseUrl: string,
): Promise<JWTPayload> => {
  const clientRegistry = await getClientRegistry();
  const appConfig = await getAppConfig();
  const decodedJwt = decodeJwt(clientAssertion);
  const { iss, iat, aud } = decodedJwt;

  if (!iss) {
    errorManager.throwError(
      "invalidClientAssertion",
      "Missing iss in client assertion",
    );
  }

  if (!iat) {
    return errorManager.throwError(
      "invalidClientAssertion",
      `Missing iat in client assertion, iss=${String(iss)}`,
    );
  }

  if (iat * 1000 > Date.now()) {
    errorManager.throwError(
      "invalidClientAssertion",
      `Client assertion iat is in the future, iss=${String(iss)}`,
    );
  }

  if (!aud) {
    return errorManager.throwError(
      "invalidClientAssertion",
      `Missing aud in client assertion, iss=${String(iss)}`,
    );
  }

  const audList = Array.isArray(aud) ? aud : [aud];
  const tokenEndpointUrl = `${apiBaseUrl}/token`;
  if (!audList.includes(tokenEndpointUrl)) {
    return errorManager.throwError(
      "invalidClientAssertion",
      `Invalid aud in client assertion: ${audList.join(", ")} for iss=${String(iss)}, does not contain ${tokenEndpointUrl}`,
    );
  }

  const client = clientRegistry.find((c) => {
    return c.client_id === iss;
  });

  if (!client) {
    errorManager.throwError(
      "invalidClientAssertion",
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Client ${iss} not found for client assertion`,
    );
  }

  assert.ok(client);

  metrics.addDimensions({
    client_id: client.client_id,
  });
  metrics.addMetric("TokenRequestWithContext", MetricUnit.Count, 1);

  logger.appendKeys({
    client_id: client.client_id,
  });

  try {
    // Check that kid is present in JWT header
    const header = decodeProtectedHeader(clientAssertion);
    if (!header.kid) {
      errorManager.throwError(
        "invalidClientAssertion",
        `Missing kid in client assertion header for iss=${String(iss)}`,
      );
    }

    const jwks = createRemoteJWKSet(
      new URL(
        getEnvironment() === "local"
          ? (client.jwks_uri_from_container ?? client.jwks_uri)
          : client.jwks_uri,
      ),
      {
        cacheMaxAge: appConfig.jwks_cache_max_age,
        timeoutDuration: appConfig.jwks_http_timeout,
      },
    );
    const { payload } = await jwtVerify(clientAssertion, jwks, {
      algorithms: jwtVerifyAlgorithms,
    });

    return payload;
  } catch (e) {
    errorManager.throwError(
      "invalidClientAssertion",
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      `Failed to verify client assertion for iss=${String(iss)}: ${(e as Error).message}`,
    );
  }

  throw new Error(
    "This should be unreachable if errorManager.throwError works as intended",
  );
};
