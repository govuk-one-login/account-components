import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { MockRequestObjectScenarios, Scope } from "../../types/common.js";
import { getClientRegistryWithInvalidClient } from "../utils/getClientRegistryWithInvalidClient/index.js";
import { paths } from "../../utils/paths.js";
import assert from "node:assert";
import * as v from "valibot";

const requestBodySchema = v.object({
  client_id: v.string(),
});

export async function createRequestObjectGet(
  _: FastifyRequest,
  reply: FastifyReply,
  redirect_uri?: string,
) {
  const availableScopes = Object.values(Scope);
  const availableScenarios = Object.values(MockRequestObjectScenarios);
  const availableClients = await getClientRegistryWithInvalidClient();

  assert.ok(reply.render);
  await reply.render("generateRequestObject/handlers/create.njk", {
    availableScopes,
    availableScenarios,
    availableClients,
    redirect_uri,
  });
  return reply;
}

export function createRequestObjectPost(fastify: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const requestBody = v.parse(requestBodySchema, request.body);
    const response = await fastify.inject({
      method: "POST",
      url: paths.requestObjectGenerator,
      payload: new URLSearchParams(requestBody).toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const { body: object } = response;

    const redirectUrl = (await getClientRegistryWithInvalidClient()).find(
      (client) => client.client_id === requestBody.client_id,
    )?.redirect_uris[0];

    assert.ok(redirectUrl);

    const url = new URL(redirectUrl);
    url.searchParams.append("request", object);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "am-account-delete");
    url.searchParams.append("client_id", requestBody.client_id);

    await createRequestObjectGet(request, reply, url.toString());
  };
}
