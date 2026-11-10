import type { FastifyReply, FastifyRequest } from "fastify";
import { saveStubOutput } from "../../utils/saveStubOutput.js";

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  await saveStubOutput(request);

  reply.send();
  return reply;
}
