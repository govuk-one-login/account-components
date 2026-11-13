import type { FastifyReply, FastifyRequest } from "fastify";
import { saveStubOutput } from "../../utils/saveStubOutput.js";

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  await saveStubOutput({
    body: request.body,
    method: request.method,
    url: request.url,
  });

  reply.send();
  return reply;
}
