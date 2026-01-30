import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";
import type { getClaimsSchema } from "../../../utils/getClaimsSchema.js";
import type * as v from "valibot";
import { authorizeErrors } from "../../../utils/authorizeErrors.js";
import type { FastifyReply } from "fastify";

const dynamoDbClient = getDynamoDbClient();

export const checkJtiUnused = async (
  reply: FastifyReply,
  claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  try {
    const appConfig = await getAppConfig();

    const savedJtiExpires =
      Math.floor(Date.now() / 1000) + appConfig.jti_nonce_ttl_in_seconds;

    await dynamoDbClient.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: process.env["REPLAY_ATTACK_TABLE_NAME"],
            Item: {
              nonce: claims.jti,
              expires: savedJtiExpires,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
      ],
    });

    return;
  } catch (error) {
    if (
      error instanceof TransactionCanceledException &&
      error.CancellationReasons?.[0]?.Code === "ConditionalCheckFailed"
    ) {
      logger.warn("JTIAlreadyUsed", {
        client_id: clientId,
        jti: claims.jti,
      });
      metrics.addMetric("JTIAlreadyUsed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          reply,
          redirectUri,
          authorizeErrors.jtiAlreadyUsed,
          state,
        ),
      );
    }

    logger.warn("FailedToCheckJtiUnused", {
      client_id: clientId,
      jti: claims.jti,
      error,
    });
    metrics.addMetric("FailedToCheckJtiUnused", MetricUnit.Count, 1);
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        reply,
        redirectUri,
        authorizeErrors.failedToCheckJtiUnused,
        state,
      ),
    );
  }
};
