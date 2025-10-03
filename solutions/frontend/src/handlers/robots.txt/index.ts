import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";

export async function handler(_request: FastifyRequest, reply: FastifyReply) {
  return reply
    .type("text/plain")
    .header("cache-control", "public, max-age=300, immutable")
    .send(
      `
User-agent: *
Disallow:${getEnvironment() === "production" ? "" : " /"}
  `.trim(),
    );
}
