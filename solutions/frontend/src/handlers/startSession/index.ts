import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { getClaimsSchema } from "../../../../api/src/lambda/authorize/utils/getClaimsSchema.js";
import * as v from "valibot";
import {
  authorizeErrors,
  getRedirectToClientRedirectUri,
} from "../../../../commons/utils/authorize/index.js";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { paths } from "../../utils/paths.js";

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
  reply.setCookie(...getUnsetApiSessionCookieArgs());
  reply.redirect(paths.authorizeError);
};

const queryParamsSchema = v.object({
  client_id: v.pipe(v.string(), v.nonEmpty()),
  redirect_uri: v.pipe(v.string(), v.url()),
  state: v.optional(v.string()),
});

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const queryParams = v.parse(queryParamsSchema, request.query, {
      abortEarly: false,
    });

    const clientRegistry = await getClientRegistry();
    const client = clientRegistry.find(
      (client) => client.client_id === queryParams.client_id,
    );

    if (!client) {
      request.log.warn("ClientNotFound");
      metrics.addMetric("ClientNotFound", MetricUnit.Count, 1);
      redirectToErrorPage(reply);
      return await reply;
    }

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

      const claimsResult = v.safeParse(
        getClaimsSchema(client, queryParams.redirect_uri, queryParams.state),
        apiSession.Item["claims"],
        {
          abortEarly: false,
        },
      );

      if (!claimsResult.success) {
        request.log.warn(
          {
            client_id: client.client_id,
            claims_with_issues: claimsResult.issues.map((issue) =>
              v.getDotPath(issue),
            ),
          },
          "InvalidClaimsInApiSession",
        );
        metrics.addMetric("InvalidClaimsInApiSession", MetricUnit.Count, 1);
        redirectToErrorPage(reply);
        return await reply;
      }

      claims = claimsResult.output;
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
