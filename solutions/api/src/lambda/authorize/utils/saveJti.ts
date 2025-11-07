import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  authorizeErrors,
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";

const dynamoDbClient = getDynamoDbClient();

export const saveJti = async (
  jti: string,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  try {
    const appConfig = await getAppConfig();

    await dynamoDbClient.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: process.env["REPLAY_ATTACK_TABLE_NAME"],
            Item: {
              nonce: jti,
              expires:
                Math.floor(Date.now() / 1000) +
                appConfig.jti_nonce_ttl_in_seconds,
            },
            ConditionExpression: "attribute_not_exists(nonce)",
          },
        },
      ],
    });
    return undefined;
  } catch (error) {
    if (
      error instanceof TransactionCanceledException &&
      error.CancellationReasons?.find(
        (reason) => reason.Code === "ConditionalCheckFailed",
      )
    ) {
      logger.warn("JTIAlreadyUsed", {
        client_id: clientId,
        jti,
      });
      metrics.addMetric("JTIAlreadyUsed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jtiAlreadyUsed,
          state,
        ),
      );
    }
    logger.warn("FailedToSaveJTI", {
      client_id: clientId,
      jti,
      error,
    });
    metrics.addMetric("FailedToSaveJTI", MetricUnit.Count, 1);
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        redirectUri,
        authorizeErrors.failedToSaveJti,
        state,
      ),
    );
  }
};
