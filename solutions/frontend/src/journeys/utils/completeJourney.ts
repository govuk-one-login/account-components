import type { FastifyReply, FastifyRequest } from "fastify";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { randomBytes } from "node:crypto";
import { getAppConfig } from "../../../../commons/utils/getAppConfig/index.js";
import type { getClaimsSchema } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import type * as v from "valibot";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../utils/redirectToClientRedirectUri.js";

const dynamoDbClient = getDynamoDbClient();

export const completeJourney = async (
  request: FastifyRequest,
  reply: FastifyReply,
  claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>,
  journeyOutcome: object[],
) => {
  try {
    const authCode = randomBytes(24).toString("hex");
    const outcomeId = randomBytes(24).toString("hex");

    const appConfig = await getAppConfig();

    await dynamoDbClient.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: process.env["JOURNEY_OUTCOME_TABLE_NAME"],
            Item: {
              outcome_id: outcomeId,
              outcome: journeyOutcome,
              scope: claims.scope,
              sub: claims.sub,
            },
          },
        },
        {
          Put: {
            TableName: process.env["AUTH_CODE_TABLE_NAME"],
            Item: {
              code: authCode,
              outcome_id: outcomeId,
              client_id: claims.client_id,
              sub: claims.sub,
              redirect_uri: claims.redirect_uri,
              expires: Math.floor(Date.now() / 1000) + appConfig.auth_code_ttl,
            },
          },
        },
      ],
    });

    return await redirectToClientRedirectUri(
      request,
      reply,
      claims.redirect_uri,
      undefined,
      claims.state,
      authCode,
    );
  } catch (error) {
    request.log.warn({ error }, "FailedToCompleteJourney");
    metrics.addMetric("FailedToCompleteJourney", MetricUnit.Count, 1);
    return await redirectToClientRedirectUri(
      request,
      reply,
      claims.redirect_uri,
      authorizeErrors.failedToCompleteJourney,
      claims.state,
    );
  }
};
