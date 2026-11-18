import type { FastifyRequest, FastifyReply } from "fastify";
import { decodeJwt } from "jose";

export async function verifyPasswordPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.headers.authorization) {
    reply.status(401);
    reply.send();
    return false;
  }

  const token = request.headers.authorization.split(" ")[1];
  if (token) {
    const claims = decodeJwt(token);

    if (claims["verifyPassword_scenario"] === "unsuccessful_verification") {
      reply.send({
        verified: false,
      });
      return reply;
    }
  }

  reply.send({
    verified: true,
  });
  return reply;
}
