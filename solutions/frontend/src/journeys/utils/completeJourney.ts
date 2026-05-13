import type { FastifyReply, FastifyRequest } from "fastify";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { randomBytes } from "node:crypto";
import { getAppConfig } from "../../../../commons/utils/getAppConfig/index.js";
import { buildRedirectToClientRedirectUri } from "../../utils/buildRedirectToClientRedirectUri.js";
import assert from "node:assert";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { destroySession } from "../../utils/session.js";

const dynamoDbClient = getDynamoDbClient();

export const completeJourney = async (
  ...[request, reply, successOrOutcomeId]:
    | [request: FastifyRequest, reply: FastifyReply, success: boolean]
    | [request: FastifyRequest, reply: FastifyReply, existingOutcomeId: string]
) => {
  assert.ok(request.session.claims);

  const claims = request.session.claims;

  const authCode = randomBytes(24).toString("hex");

  const journeyAlreadyCompleted = typeof successOrOutcomeId === "string";

  const outcomeId = journeyAlreadyCompleted
    ? successOrOutcomeId
    : randomBytes(24).toString("hex");

  const appConfig = await getAppConfig();

  let transactItems: TransactWriteCommandInput["TransactItems"] = [
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
  ];

  let killSession = false;

  if (!journeyAlreadyCompleted) {
    assert.ok(
      !!request.session.journeyActions?.length,
      "There are no journey actions",
    );

    assert.ok(
      !request.session.journeyActions.some(
        (journeyAction) => !("success" in journeyAction),
      ),
      "Not all actions are completed",
    );

    killSession = request.session.journeyActions.some(
      (journeyAction) =>
        "error" in journeyAction && journeyAction.error.destroySession,
    );

    const actions = request.session.journeyActions.map((action) => {
      if ("error" in action) {
        const { code, description } = action.error;
        return { ...action, error: { code, description } };
      }
      return action;
    });

    transactItems = [
      {
        Put: {
          TableName: process.env["JOURNEY_OUTCOME_TABLE_NAME"],
          Item: {
            outcome_id: outcomeId,
            sub: claims.sub,
            email: claims.email,
            scope: claims.scope,
            success: successOrOutcomeId,
            actions,
            expires:
              Math.floor(Date.now() / 1000) + appConfig.journey_outcome_ttl,
          },
        },
      },
      ...transactItems,
    ];
  }

  await dynamoDbClient.transactWrite({
    TransactItems: transactItems,
  });

  if (!journeyAlreadyCompleted) {
    metrics.addMetric(
      successOrOutcomeId
        ? "JourneyCompletedSuccessfully"
        : "JourneyCompletedUnsuccessfully",
      MetricUnit.Count,
      1,
    );

    request.session.completedJourneyOutcomeId = outcomeId;

    if (killSession) {
      await destroySession(request);
    }
  }

  reply.redirect(
    buildRedirectToClientRedirectUri(
      claims.redirect_uri,
      undefined,
      claims.state,
      authCode,
    ),
  );

  return reply;
};
