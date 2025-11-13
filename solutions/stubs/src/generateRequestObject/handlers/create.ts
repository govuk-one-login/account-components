import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import type { JwtHeader, RequestBody } from "../../types/common.js";
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

const requestBodySchema = v.object({
  client_id: v.string(),
  scenario: v.string(),
  scope: v.string(),
  jti: v.string(),
  exp: v.string(),
  iss: v.string(),
  user: v.string(),
  state: v.string(),
});

export async function createRequestObjectGet(
  _: FastifyRequest,
  reply: FastifyReply,
  authorizeUrl?: string,
  jwtPayload?: JWTPayload,
  jwtHeader?: JwtHeader,
  originalRequest?: RequestBody,
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
    originalRequest,
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
    }
    const { body } = response;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const result = JSON.parse(body) as GenerateJARResponse;

    assert.ok(process.env["AUTHORIZE_URL"], "AUTHORIZE_URL is not set");

    const url = new URL(process.env["AUTHORIZE_URL"]);
    url.searchParams.append("client_id", requestBody.client_id);
    url.searchParams.append("scope", "account-delete");
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", redirectUrl);
    url.searchParams.append("request", result.encryptedJar);
    if (typeof result.jwtPayload["state"] === "string") {
      url.searchParams.append("state", result.jwtPayload["state"]);
    }

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
