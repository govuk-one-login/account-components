import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import type { JwtHeader } from "../../types/common.js";
import {
  MockRequestObjectScenarios,
  Scope,
  Users,
} from "../../types/common.js";
import { getClientRegistryWithInvalidClient } from "../utils/getClientRegistryWithInvalidClient/index.js";
import { paths } from "../../utils/paths.js";
import assert from "node:assert";
import * as v from "valibot";
import type { JWTPayload } from "jose";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";
import { createHash } from "node:crypto";
import { checkUserAgentCookieName } from "../../../../commons/utils/constants.js";

export const requestBodySchema = v.object({
  client_id: v.string(),
  scenario: v.string(),
  scope: v.string(),
  jti: v.string(),
  exp: v.string(),
  iss: v.string(),
  user: v.string(),
  state: v.string(),
  user_email_address: v.string(),
  account_management_api_authenticate_scenario: v.string(),
  account_management_api_deleteAccount_scenario: v.string(),
  account_management_api_sendOtpChallenge_scenario: v.string(),
  account_management_api_verifyOtpChallenge_scenario: v.string(),
  account_data_api_createPassKey_scenario: v.string(),
});

export async function createRequestObjectGet(
  _: FastifyRequest,
  reply: FastifyReply,
  authorizeUrl?: string,
  jwtPayload?: JWTPayload,
  jwtHeader?: JwtHeader,
  originalRequestBody?: v.InferOutput<typeof requestBodySchema>,
) {
  const availableScopes = Object.values(Scope);
  const availableScenarios = Object.values(MockRequestObjectScenarios);
  const availableClients = await getClientRegistryWithInvalidClient();
  const availableUsers = Object.values(Users);

  assert.ok(reply.render);
  await reply.render("generateRequestObject/handlers/create.njk", {
    availableScopes,
    availableScenarios,
    availableClients,
    availableUsers,
    authorizeUrl,
    jwtPayload,
    jwtHeader,
    originalRequestBody,
  });
  return reply;
}

export function createRequestObjectPost(fastify: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const requestBody = v.parse(requestBodySchema, request.body);

    const redirectUrl = (await getClientRegistryWithInvalidClient()).find(
      (client) => client.client_id === requestBody.client_id,
    )?.redirect_uris[0];
    assert.ok(redirectUrl);

    const response = await fastify.inject({
      method: "POST",
      url: paths.requestObjectGenerator,
      payload: new URLSearchParams({
        ...requestBody,
        redirect_uri: redirectUrl,
      }).toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    interface GenerateJARResponse {
      encryptedJar: string;
      jwtPayload: JWTPayload;
      jwtHeader: JwtHeader;
      token: string;
    }
    const { body } = response;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const result = JSON.parse(body) as GenerateJARResponse;

    assert.ok(process.env["AUTHORIZE_URL"], "AUTHORIZE_URL is not set");

    const url = new URL(process.env["AUTHORIZE_URL"]);
    url.searchParams.append("client_id", requestBody.client_id);
    url.searchParams.append("scope", requestBody.scope);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", redirectUrl);
    url.searchParams.append("request", result.encryptedJar);
    if (typeof result.jwtPayload["state"] === "string") {
      url.searchParams.append("state", result.jwtPayload["state"]);
    }

    assert.ok(process.env["ROOT_DOMAIN"]);

    reply.setCookie(
      checkUserAgentCookieName,
      createHash("sha256").update(result.token).digest("hex"),
      {
        secure: getEnvironment() !== "local",
        httpOnly: true,
        domain: process.env["ROOT_DOMAIN"],
      },
    );

    await createRequestObjectGet(
      request,
      reply,
      url.toString(),
      result.jwtPayload,
      result.jwtHeader,
      requestBody,
    );
  };
}
