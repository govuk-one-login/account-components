import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import * as v from "valibot";
import { logger } from "../../../../commons/utils/logger/index.js";

export async function sendEmailPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = v.parse(
    v.object({
      reference: v.optional(v.string()),
    }),
    request.body,
    { abortEarly: false },
  );

  logger.info("NotifySendEmailCalled", {
    reference: body.reference,
  });

  await reply.send({
    data: {
      id: randomUUID(),
      reference: body.reference,
    },
  });
  return await reply;
}
