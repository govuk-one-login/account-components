import type { FastifyRequest, FastifyReply } from "fastify";
import * as v from "valibot";

export async function passkeysGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.headers.authorization) {
    reply.status(401);
    reply.send();
    return reply;
  }

  v.parse(
    v.object({
      publicSubjectId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  reply.send({ passkeys: [] });
  return reply;
}

export async function passkeysPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.headers.authorization) {
    reply.status(401);
    reply.send();
    return reply;
  }

  v.parse(
    v.object({
      publicSubjectId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  reply.status(201);
  reply.send();
  return reply;
}
