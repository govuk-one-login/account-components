import type { FastifyReply, FastifyRequest } from "fastify";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { randomBytes } from "node:crypto";
import { getAppConfig } from "../../../../commons/utils/getAppConfig/index.js";
import type { JourneyOutcome } from "../../../../commons/utils/commonTypes.js";
import { buildRedirectToClientRedirectUri } from "../../utils/buildRedirectToClientRedirectUri.js";
import assert from "node:assert";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

const dynamoDbClient = getDynamoDbClient();

export type UnsuccessfulJourneyCompletionDetails = {
  error: {
    code: number;
    description: string;
  };
} & JourneyOutcome["journeys"][number]["details"];
export type SuccessfulJourneyCompletionDetails =
  JourneyOutcome["journeys"][number]["details"];

export const completeJourney = async (
  ...[request, reply, journeyOutcomeDetails, success]:
    | [
        request: FastifyRequest,
        reply: FastifyReply,
        journeyOutcomeDetails: UnsuccessfulJourneyCompletionDetails,
        success: false,
      ]
    | [
        request: FastifyRequest,
        reply: FastifyReply,
        journeyOutcomeDetails: SuccessfulJourneyCompletionDetails,
        success: true,
      ]
) => {
  assert.ok(request.session.claims);

  const claims = request.session.claims;

  const authCode = randomBytes(24).toString("hex");
  const outcomeId = randomBytes(24).toString("hex");

  const appConfig = await getAppConfig();

  const journeyOutcome: JourneyOutcome = {
    outcome_id: outcomeId,
    sub: claims.sub,
    email: claims.email,
    scope: claims.scope,
    success,
    journeys: [
      {
        journey: claims.scope,
        timestamp: Date.now(),
        success,
        details: journeyOutcomeDetails,
      },
    ],
  };

  const journeyAlreadyCompleted = !!request.session.completedJourneyDetails;

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

  if (!journeyAlreadyCompleted) {
    transactItems = [
      {
        Put: {
          TableName: process.env["JOURNEY_OUTCOME_TABLE_NAME"],
          Item: {
            ...journeyOutcome,
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
      success
        ? "JourneyCompletedSuccessfully"
        : "JourneyCompletedUnsuccessfully",
      MetricUnit.Count,
      1,
    );
  }

  if (!journeyAlreadyCompleted) {
    request.session.completedJourneyDetails = success
      ? {
          successful: journeyOutcomeDetails,
        }
      : {
          unsuccessful: journeyOutcomeDetails,
        };
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
