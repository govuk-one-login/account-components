import type { FastifyRequest, FastifyReply } from "fastify";
import * as v from "valibot";

export async function passkeysPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.headers.authorization) {
    reply.status(401);
    reply.send();
    return reply;
  }

  const { publicSubjectId } = v.parse(
    v.object({
      publicSubjectId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  // TODO align with spec

  reply.send();
  return reply;
}
