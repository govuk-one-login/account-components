import { randomBytes } from "node:crypto";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import type { FastifyReply } from "fastify";
import type * as v from "valibot";
import type { getClaimsSchema } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { getRedirectToClientRedirectUri } from "../../../../commons/utils/authorize/getRedirectToClientRedirectUri.js";

/*
This temporary code to allow us to test an end to end journey.
In reality this will redirect into the journey, not to the callback URL.
*/

const dynamoDbClient = getDynamoDbClient();

export const tempSuccessfulJourney = async (
  reply: FastifyReply,
  claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>,
) => {
  const authCode = randomBytes(24).toString("hex");
  const outcomeId = randomBytes(24).toString("hex");

  await dynamoDbClient.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: process.env["JOURNEY_OUTCOME_TABLE_NAME"],
          Item: {
            outcome_id: outcomeId,
            outcome: [{ account_delete: true, timestamp: 1234567890 }],
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
            scope: claims.scope,
            expiry_time: Math.floor(Date.now() / 1000) + 300, // TODO when really implementing get 300 from app config
          },
        },
      },
    ],
  });

  reply.redirect(
    getRedirectToClientRedirectUri(
      claims.redirect_uri,
      undefined,
      claims.state,
      authCode,
    ),
  );
  return reply;
};
