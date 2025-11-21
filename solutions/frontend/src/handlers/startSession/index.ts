import { type FastifyReply, type FastifyRequest } from "fastify";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import * as v from "valibot";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { initialJourneyPaths } from "../../utils/paths.js";
import { getClaimsSchema } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import { destroyApiSession } from "../../utils/apiSession.js";
import { redirectToAuthorizeErrorPage } from "../../utils/redirectToAuthorizeErrorPage.js";
import { sessionPrefix } from "../../utils/session.js";
import { decodeJwt } from "jose";
import { redirectToClientRedirectUri } from "../../utils/redirectToClientRedirectUri.js";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";

const dynamoDbClient = getDynamoDbClient();

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
      return await redirectToAuthorizeErrorPage(request, reply);
    }

    if (!request.cookies["apisession"]) {
      request.log.warn("ApiSessionCookieNotSet");
      metrics.addMetric("ApiSessionCookieNotSet", MetricUnit.Count, 1);
      return await redirectToAuthorizeErrorPage(request, reply);
    }

    let claims: v.InferOutput<ReturnType<typeof getClaimsSchema>>;

    try {
      const apiSession = await dynamoDbClient.get({
        TableName: process.env["API_SESSIONS_TABLE_NAME"],
        Key: {
          id: request.cookies["apisession"],
        },
        ConsistentRead: true,
      });

      if (!apiSession.Item) {
        request.log.warn("ApiSessionNotFound");
        metrics.addMetric("ApiSessionNotFound", MetricUnit.Count, 1);
        return await redirectToAuthorizeErrorPage(request, reply);
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
        return await redirectToAuthorizeErrorPage(request, reply);
      }

      claims = claimsResult.output;
      metrics.addDimensions({ client_id: claims.client_id });

      await request.session.regenerate();
      request.session.claims = claims;
      request.session.user_id = claims.sub;
      await request.session.save();

      /* This is a bit gross as we're manually updating the expiry on
      the session row. But @fastify/session doesn't provide a way to change
      the expiry of an individual session so we have to do it manually. */
      try {
        const accessTokenExpiry = decodeJwt(claims.access_token).exp ?? 0;

        console.log("MHTEST", accessTokenExpiry);

        const sessionExpiry = Math.min(
          Math.max(
            accessTokenExpiry,
            Math.floor(Date.now() / 1000) + 1800, // Min session length of half an hour
          ),
          Math.floor(Date.now() / 1000) + 3600, // Max session length of 2 hours
        );

        console.log("MHTESTsessionExpiry", sessionExpiry);

        await dynamoDbClient.update({
          TableName: process.env["SESSIONS_TABLE_NAME"],
          Key: {
            id: `${sessionPrefix}${request.session.sessionId}`,
          },
          UpdateExpression: "SET expires = :expires",
          ExpressionAttributeValues: {
            ":expires": sessionExpiry,
          },
        });

        const sessionFromDb = await dynamoDbClient.get({
          TableName: process.env["SESSIONS_TABLE_NAME"],
          Key: {
            id: `${sessionPrefix}${request.session.sessionId}`,
          },
          ConsistentRead: true,
        });
        console.log("MHTESTsessionFromDb", sessionFromDb);
      } catch (error) {
        request.log.error(error, "SetSessionExpiryError");
        metrics.addMetric("SetSessionExpiryError", MetricUnit.Count, 1);
        return await redirectToClientRedirectUri(
          request,
          reply,
          claims.redirect_uri,
          authorizeErrors.setSessionExpiryError,
          claims.state,
        );
      }

      await destroyApiSession(request, reply);
      reply.redirect(initialJourneyPaths[claims.scope]);
      return await reply;
    } catch (error) {
      request.log.error(error, "ApiSessionGetError");
      metrics.addMetric("ApiSessionGetError", MetricUnit.Count, 1);
      return await redirectToAuthorizeErrorPage(request, reply);
    }
  } catch (error) {
    request.log.error(error, "StartSessionError");
    metrics.addMetric("StartSessionError", MetricUnit.Count, 1);
    return await redirectToAuthorizeErrorPage(request, reply);
  }
}
