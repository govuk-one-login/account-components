import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";

export async function handler(_request: FastifyRequest, reply: FastifyReply) {
  assert.ok(reply.render);
  reply.status(401);
  await reply.render("handlers/pageExpired/index.njk");
  return reply;
}
