import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import type { getClaimsSchema } from "../../../../api/src/lambda/authorize/utils/getClaimsSchema.js";
import type * as v from "valibot";
import {
  authorizeErrors,
  getRedirectToClientRedirectUri,
} from "../../../../commons/utils/authorize/index.js";

const dynamoDbClient = getDynamoDbClient();

const getUnsetApiSessionCookieArgs = (): Parameters<
  FastifyReply["setCookie"]
> => {
  assert.ok(
    process.env["API_SESSION_COOKIE_DOMAIN"],
    "API_SESSION_COOKIE_DOMAIN is not set",
  );

  return [
    "apisession",
    "",
    {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      domain: process.env["API_SESSION_COOKIE_DOMAIN"],
      maxAge: 0,
    },
  ] as const;
};

const redirectToErrorPage = (reply: FastifyReply) => {
  assert.ok(
    process.env["AUTHORIZE_ERROR_PAGE_URL"],
    "AUTHORIZE_ERROR_PAGE_URL is not set",
  );
  reply.setCookie(...getUnsetApiSessionCookieArgs());
  reply.redirect(process.env["AUTHORIZE_ERROR_PAGE_URL"]);
};

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.cookies["apisession"]) {
      request.log.warn("ApiSessionCookieNotSet");
      metrics.addMetric("ApiSessionCookieNotSet", MetricUnit.Count, 1);
      redirectToErrorPage(reply);
      return await reply;
    }

    let claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>;

    try {
      const apiSession = await dynamoDbClient.get({
        TableName: process.env["API_SESSIONS_TABLE_NAME"],
        Key: {
          id: request.cookies["apisession"],
        },
      });

      if (!apiSession.Item) {
        request.log.warn("ApiSessionNotFound");
        metrics.addMetric("ApiSessionNotFound", MetricUnit.Count, 1);
        redirectToErrorPage(reply);
        return await reply;
      }

      claims = apiSession.Item["claims"] as typeof claims;
      metrics.addDimensions({ client_id: claims.client_id });

      try {
        await dynamoDbClient.delete({
          TableName: process.env["API_SESSIONS_TABLE_NAME"],
          Key: {
            id: request.cookies["apisession"],
          },
        });
      } catch (error) {
        request.log.error(error, "ApiSessionDeleteError");
        metrics.addMetric("ApiSessionDeleteError", MetricUnit.Count, 1);

        reply.setCookie(...getUnsetApiSessionCookieArgs());
        reply.redirect(
          getRedirectToClientRedirectUri(
            claims.redirect_uri,
            authorizeErrors.failedToDeleteApiSession,
            claims.state,
          ),
        );
        return await reply;
      }

      await request.session.regenerate();
      request.session.claims = claims;
      request.session.user_id = claims.sub;

      reply.setCookie(...getUnsetApiSessionCookieArgs());
      reply.redirect("/TODO");
      return await reply;
    } catch (error) {
      request.log.error(error, "ApiSessionGetError");
      metrics.addMetric("ApiSessionGetError", MetricUnit.Count, 1);
      redirectToErrorPage(reply);
      return await reply;
    }
  } catch (error) {
    request.log.error(error, "StartSessionError");
    metrics.addMetric("StartSessionError", MetricUnit.Count, 1);
    redirectToErrorPage(reply);
    return reply;
  }
}
