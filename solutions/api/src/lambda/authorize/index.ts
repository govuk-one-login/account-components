import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getQueryParams } from "./utils/getQueryParams.js";
import { badRequestResponse, ErrorResponse } from "./utils/common.js";
import { getClient } from "./utils/getClient.js";
import { decryptJar } from "./utils/decryptJar.js";
import { verifyJwt } from "./utils/verifyJwt.js";
import { logger } from "../../../../commons/utils/logger/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { saveJti } from "./utils/saveJti.js";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const queryParams = getQueryParams(event);
    if (queryParams instanceof ErrorResponse) {
      return queryParams.errorResponse;
    }

    const client = await getClient(
      queryParams.client_id,
      queryParams.redirect_uri,
    );
    if (client instanceof ErrorResponse) {
      return client.errorResponse;
    }

    const signedJwt = await decryptJar(
      queryParams.request,
      queryParams.client_id,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (signedJwt instanceof ErrorResponse) {
      return signedJwt.errorResponse;
    }

    const claims = await verifyJwt(
      signedJwt,
      client,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (claims instanceof ErrorResponse) {
      return claims.errorResponse;
    }

    // set up session here

    const saveJtiResult = await saveJti(
      claims.jti,
      client.client_id,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (saveJtiResult instanceof ErrorResponse) {
      return saveJtiResult.errorResponse;
    }

    // TODO used for debugging. Remove before going live!
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Authorized", claims }, null, 2),
    };
  } catch (error) {
    logger.error("Authorize error", {
      error,
    });
    metrics.addMetric("InvalidAuthorizeRequest", MetricUnit.Count, 1);
    return badRequestResponse;
  }
};
