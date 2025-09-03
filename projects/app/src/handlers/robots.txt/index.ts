import type { FastifyReply, FastifyRequest } from "fastify";

export async function handler(_request: FastifyRequest, reply: FastifyReply) {
  return reply
    .type("text/plain")
    .header("cache-control", "public, max-age=300, immutable")
    .send(
      `
User-agent: *
Disallow:
  `.trim(),
    );
}
