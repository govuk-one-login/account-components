import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import assert from "node:assert";
import crypto from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";
import type { ClientEntry } from "../../../../config/schema/types.js";
import { getParametersProvider } from "../../../../commons/utils/awsClient/ssmClient/index.js";
import deterministicJsonStringify from "fast-json-stable-stringify";
import { Kids } from "../../types/common.js";

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

      const { tokenRequestBody, algorithm } = await getTokenRequestBody({
        client,
        authCode: parsedRequestQueryParams.code,
        currentUrl: currentUrl.toString(),
      });

      assert.ok(process.env["AMC_API_BASE_URL"], "AMC_API_BASE_URL is not set");

      const tokenResponse = await fetch(
        `${process.env["AMC_API_BASE_URL"]}/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: tokenRequestBody.toString(),
        },
      );

      const parsedTokenResponseBody = v.parse(
        v.object({
          access_token: v.string(),
          token_type: v.literal("Bearer"),
          expires_in: v.pipe(v.number(), v.integer(), v.minValue(1)),
        }),
        await tokenResponse.json(),
      );

      const journeyOutcomeResponse = await fetch(
        `${process.env["AMC_API_BASE_URL"]}/journeyoutcome`,
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        journeyOutcomeDetails: JSON.parse(
          deterministicJsonStringify(journeyOutcomeDetails),
        ),
        algorithm,
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
    process.env["MOCK_CLIENT_RSA_PRIVATE_KEY_SSM_NAME"],
    "MOCK_CLIENT_RSA_PRIVATE_KEY_SSM_NAME is not set",
  );
  assert.ok(
    process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"],
    "MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME is not set",
  );

  // randomly uses RSA or EC private key for client assertion signing
  const useRSA = Math.random() < 0.5;
  const ssmName = useRSA
    ? process.env["MOCK_CLIENT_RSA_PRIVATE_KEY_SSM_NAME"]
    : process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"];
  const algorithm = useRSA ? "RS256" : "ES256";
  const kid = useRSA ? Kids.RSA : Kids.EC;

  const privateKeyPem = await getParametersProvider().get(ssmName, {
    maxAge: 900,
  });

  assert.ok(privateKeyPem, "privateKeyPem is not set");
  assert.ok(process.env["AMC_API_BASE_URL"], "AMC_API_BASE_URL is not set");

  const clientAssertion = await new SignJWT({
    iss: client.client_id,
    aud: `${process.env["AMC_API_BASE_URL"]}/token`,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: algorithm, kid })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(await importPKCS8(privateKeyPem, algorithm));

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
    redirect_uri: currentUrl,
  });

  return { tokenRequestBody: params, algorithm };
};
