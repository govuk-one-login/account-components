import type { FastifyReply, FastifyRequest } from "fastify";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { randomBytes } from "node:crypto";
import { getAppConfig } from "../../../../commons/utils/getAppConfig/index.js";
import type { JourneyOutcome } from "../../../../commons/utils/interfaces.js";
import { buildRedirectToClientRedirectUri } from "../../../../commons/utils/authorize/buildRedirectToClientRedirectUri.js";
import { destroySession } from "../../utils/session.js";
import { destroyApiSession } from "../../utils/apiSession.js";
import assert from "node:assert";

const dynamoDbClient = getDynamoDbClient();

export const completeJourney = async (
  ...[request, reply, journeyOutcomeDetails, success]:
    | [
        request: FastifyRequest,
        reply: FastifyReply,
        journeyOutcomeDetails: {
          error: {
            code: number;
            description: string;
          };
        } & JourneyOutcome["journeys"][number]["details"],
        success: false,
      ]
    | [
        request: FastifyRequest,
        reply: FastifyReply,
        journeyOutcomeDetails: JourneyOutcome["journeys"][number]["details"],
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

  await dynamoDbClient.transactWrite({
    TransactItems: [
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

  await destroyApiSession(request, reply);
  await destroySession(request);

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
