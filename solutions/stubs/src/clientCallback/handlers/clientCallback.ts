import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import assert from "node:assert";
import crypto from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";
import type { ClientEntry } from "../../../../config/schema/types.js";
import { getParametersProvider } from "../../../../commons/utils/awsClient/ssmClient/index.js";
import { jwtSigningAlgorithm } from "../../../../commons/utils/constants.js";

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  assert.ok(reply.render);

  try {
    const parsedRequestParams = v.parse(
      v.object({
        client: v.string(),
      }),
      request.params,
      {
        abortEarly: false,
      },
    );

    const clientRegistry = await getClientRegistry();
    const client = clientRegistry.find((client) => {
      return client.client_name.toLowerCase() === parsedRequestParams.client;
    });

    if (!client) {
      throw new Error(`Client '${parsedRequestParams.client}' not found`);
    }

    const parsedRequestQueryParams = v.parse(
      v.union([
        v.object({
          code: v.string(),
          state: v.optional(v.string()),
        }),
        v.object({
          error: v.string(),
          error_description: v.string(),
          state: v.optional(v.string()),
        }),
      ]),
      request.query,
    );

    if ("code" in parsedRequestQueryParams) {
      assert.ok(reply.globals.currentUrl, "currentUrl is not set");

      const currentUrl = new URL(reply.globals.currentUrl);
      currentUrl.search = "";

      const tokenRequestBody = await getTokenRequestBody({
        client,
        authCode: parsedRequestQueryParams.code,
        currentUrl: currentUrl.toString(),
      });

      assert.ok(
        process.env["API_TOKEN_ENDPOINT_URL"],
        "API_TOKEN_ENDPOINT_URL is not set",
      );

      const tokenResponse = await fetch(process.env["API_TOKEN_ENDPOINT_URL"], {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenRequestBody.toString(),
      });

      const parsedTokenResponseBody = v.parse(
        v.object({
          access_token: v.string(),
          token_type: v.literal("Bearer"),
          expires_in: v.pipe(v.number(), v.integer(), v.minValue(1)),
        }),
        await tokenResponse.json(),
      );

      assert.ok(
        process.env["API_JOURNEY_OUTCOME_ENDPOINT_URL"],
        "API_JOURNEY_OUTCOME_ENDPOINT_URL is not set",
      );

      const journeyOutcomeResponse = await fetch(
        process.env["API_JOURNEY_OUTCOME_ENDPOINT_URL"],
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${parsedTokenResponseBody.access_token}`,
          },
        },
      );

      const journeyOutcomeDetails = await journeyOutcomeResponse.json();

      await reply.render("clientCallback/handlers/clientCallback.njk", {
        client: `${client.client_name} (${client.client_id})`,
        journeyOutcomeDetails,
      });
      return await reply;
    }

    await reply.render("clientCallback/handlers/clientCallback.njk", {
      client: `${client.client_name} (${client.client_id})`,
      errorDetails: {
        ...parsedRequestQueryParams,
      },
    });
    return await reply;
  } catch (error) {
    await reply.render("clientCallback/handlers/clientCallback.njk", {
      exception: error,
    });
    return reply;
  }
}

const getTokenRequestBody = async ({
  client,
  authCode,
  currentUrl,
}: {
  client: ClientEntry;
  authCode: string;
  currentUrl: string;
}) => {
  assert.ok(
    process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"],
    "MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME is not set",
  );

  const privateKeyPem = await getParametersProvider().get(
    process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"],
  );

  assert.ok(privateKeyPem, "privateKeyPem is not set");
  assert.ok(
    process.env["API_TOKEN_ENDPOINT_URL"],
    "API_TOKEN_ENDPOINT_URL is not set",
  );

  const clientAssertion = await new SignJWT({
    iss: client.client_id,
    aud: process.env["API_TOKEN_ENDPOINT_URL"],
    jti: crypto.randomUUID(),
    sub: "urn:fdc:gov.uk:default",
  })
    .setProtectedHeader({ alg: jwtSigningAlgorithm })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(await importPKCS8(privateKeyPem, jwtSigningAlgorithm));

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
    redirect_uri: currentUrl,
  });

  return params;
};
