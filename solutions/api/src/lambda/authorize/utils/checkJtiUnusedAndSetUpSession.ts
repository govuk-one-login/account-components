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
import type { getClaimsSchema } from "../../../../../commons/utils/authorize/getClaimsSchema.js";
import type * as v from "valibot";
import { randomBytes } from "node:crypto";
import assert from "node:assert";
import { paths } from "../../../../../frontend/src/utils/paths.js";
import type { APIGatewayProxyResult } from "aws-lambda";
import { apiSessionCookieName } from "../../../../../commons/utils/constants.js";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";

const dynamoDbClient = getDynamoDbClient();

export const checkJtiUnusedAndSetUpSession = async (
  claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  try {
    assert.ok(
      process.env["API_SESSION_COOKIE_DOMAIN"],
      "API_SESSION_COOKIE_DOMAIN is not set",
    );
    assert.ok(process.env["FRONTEND_URL"], "FRONTEND_URL is not set");

    const appConfig = await getAppConfig();

    const savedJtiExpires =
      Math.floor(Date.now() / 1000) + appConfig.jti_nonce_ttl_in_seconds;

    const sessionId = randomBytes(24).toString("hex");
    const sessionExpires =
      Math.floor(Date.now() / 1000) + appConfig.api_session_ttl_in_seconds;

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
        {
          Put: {
            TableName: process.env["API_SESSIONS_TABLE_NAME"],
            Item: {
              id: sessionId,
              expires: sessionExpires,
              claims,
            },
          },
        },
      ],
    });

    const frontendUrl = new URL(process.env["FRONTEND_URL"]);
    frontendUrl.pathname = paths.startSession;
    frontendUrl.searchParams.append("client_id", clientId);
    frontendUrl.searchParams.append("redirect_uri", redirectUri);
    if (state) {
      frontendUrl.searchParams.append("state", state);
    }

    const redirectToJourneyResponse: APIGatewayProxyResult = {
      statusCode: 302,
      headers: {
        location: frontendUrl.toString(),
        "Set-Cookie": `${apiSessionCookieName}=${sessionId}; Secure; HttpOnly; SameSite=Strict; Max-Age=${appConfig.api_session_ttl_in_seconds.toString()}; Domain=${
          process.env["API_SESSION_COOKIE_DOMAIN"]
        }`,
      },
      body: "",
    };

    return redirectToJourneyResponse;
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
          redirectUri,
          authorizeErrors.jtiAlreadyUsed,
          state,
        ),
      );
    }

    logger.warn("FailedToCheckJtiUnusedAndSetUpSession", {
      client_id: clientId,
      jti: claims.jti,
      error,
    });
    metrics.addMetric(
      "FailedToCheckJtiUnusedAndSetUpSession",
      MetricUnit.Count,
      1,
    );
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        redirectUri,
        authorizeErrors.failedToCheckJtiUnusedAndSetUpSession,
        state,
      ),
    );
  }
};
