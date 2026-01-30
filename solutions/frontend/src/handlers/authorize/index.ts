import { type FastifyReply, type FastifyRequest } from "fastify";
import { getQueryParams } from "./utils/getQueryParams.js";
import { ErrorResponse, getBadRequestReply } from "./utils/common.js";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { logger } from "../../../../commons/utils/logger/index.js";
import { getClient } from "./utils/getClient.js";
import { decryptJar } from "./utils/decryptJar.js";
import { verifyJwt } from "./utils/verifyJwt.js";
import { checkJtiUnused } from "./utils/checkJtiUnused.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { startSessionAndGoToJourney } from "./utils/startSessionAndGoToJourney.js";

export async function getHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const queryParams = getQueryParams(reply, request.query);
    if (queryParams instanceof ErrorResponse) {
      return await queryParams.reply;
    }

    metrics.addDimensions({
      client_id: queryParams.client_id,
    });
    logger.appendKeys({
      client_id: queryParams.client_id,
    });

    const client = await getClient(
      reply,
      queryParams.client_id,
      queryParams.redirect_uri,
    );
    if (client instanceof ErrorResponse) {
      return await client.reply;
    }

    const signedJwt = await decryptJar(
      reply,
      queryParams.request,
      queryParams.client_id,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (signedJwt instanceof ErrorResponse) {
      return await signedJwt.reply;
    }

    const claims = await verifyJwt(
      reply,
      signedJwt,
      client,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (claims instanceof ErrorResponse) {
      return await claims.reply;
    }

    metrics.addDimensions({
      scope: claims.scope,
    });
    logger.appendKeys({
      scope: claims.scope,
    });

    const checkJtiUnusedResult = await checkJtiUnused(
      reply,
      claims,
      client.client_id,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (checkJtiUnusedResult instanceof ErrorResponse) {
      return await checkJtiUnusedResult.reply;
    }

    const startSessionAndGoToJourneyResult = await startSessionAndGoToJourney(
      reply,
      request,
      claims,
      client.client_id,
      queryParams.redirect_uri,
      queryParams.state,
    );
    if (startSessionAndGoToJourneyResult instanceof ErrorResponse) {
      return await startSessionAndGoToJourneyResult.reply;
    }

    return startSessionAndGoToJourneyResult;
  } catch (error) {
    logger.error("Authorize error", {
      error,
    });
    metrics.addMetric("InvalidAuthorizeRequest", MetricUnit.Count, 1);
    return getBadRequestReply(reply);
  }
}
