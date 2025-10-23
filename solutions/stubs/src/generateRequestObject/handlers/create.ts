import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { MockRequestObjectScenarios, Scope } from "../../types/common.js";
import { getClientRegistry } from "../utils/clientRegistry/index.js";
import { paths } from "../../utils/paths.js";
import assert from "node:assert";

interface RequestBody {
  client_id: string;
}

export async function createRequestObjectGet(
  _: FastifyRequest,
  reply: FastifyReply,
  redirect_uri?: string,
) {
  const availableScopes = Object.values(Scope);
  const availableScenarios = Object.values(MockRequestObjectScenarios);
  const availableClients = await getClientRegistry();

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
    const requestBody = request.body as RequestBody;
    const response = await fastify.inject({
      method: "POST",
      url: paths.requestObjectGenerator,
      payload: {
        ...requestBody,
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const { body: object } = response;

    const redirectUrl = (await getClientRegistry()).find(
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
