import type { FastifyReply, FastifyRequest } from "fastify";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";
import { metrics } from "../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import assert from "node:assert";
import {
  apiSessionCookieName,
  getApiSessionCookieOptions,
} from "../../../commons/utils/apiSessionCookie/index.js";

const dynamoDbClient = getDynamoDbClient();

export const destroyApiSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (request.cookies[apiSessionCookieName]) {
    try {
      await dynamoDbClient.delete({
        TableName: process.env["API_SESSIONS_TABLE_NAME"],
        Key: {
          id: request.cookies[apiSessionCookieName],
        },
      });
    } catch (error) {
      request.log.error(error, "ApiSessionDeleteError");
      metrics.addMetric("ApiSessionDeleteError", MetricUnit.Count, 1);
    }
  }

  assert.ok(
    process.env["API_SESSION_COOKIE_DOMAIN"],
    "API_SESSION_COOKIE_DOMAIN is not set",
  );

  reply.setCookie(apiSessionCookieName, "", {
    ...getApiSessionCookieOptions(process.env["API_SESSION_COOKIE_DOMAIN"]),
    maxAge: 0,
  });
};
