import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import assert from "node:assert";

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  const parsedRequestParams = v.safeParse(
    v.object({
      client: v.string(),
    }),
    request.params,
  );

  if (!parsedRequestParams.success) {
    reply.status(400).send(parsedRequestParams.issues);
    return reply;
  }

  const clientRegistry = await getClientRegistry();
  const client = clientRegistry.find((client) => {
    return (
      client.client_name.toLowerCase() === parsedRequestParams.output.client
    );
  });

  if (!client) {
    request.log.warn(`Client '${parsedRequestParams.output.client}' not found`);
    reply.status(404).send();
    return reply;
  }

  const parsedRequestQueryParams = v.parse(
    v.object({
      error: v.optional(v.string()),
      error_description: v.optional(v.string()),
      state: v.optional(v.string()),
    }),
    request.query,
  );

  assert.ok(reply.render);

  await reply.render("clientCallback/handlers/clientCallback.njk", {
    client: `${client.client_name} (${client.client_id})`,
    ...parsedRequestQueryParams,
  });
  return reply;
}
