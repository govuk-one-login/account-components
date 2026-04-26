import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import * as v from "valibot";
import { logger } from "../../../../commons/utils/logger/index.js";
import { notifyTemplateIDsSchema } from "../../../../commons/utils/notifications/index.js";

const templateIds = v.safeParse(
  notifyTemplateIDsSchema,
  process.env["NOTIFY_TEMPLATE_IDS"],
);

export async function sendEmailPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = v.parse(
    v.object({
      template_id: v.string(),
      reference: v.optional(v.string()),
    }),
    request.body,
    { abortEarly: false },
  );

  logger.info("NotifySendEmailCalled", {
    reference: body.reference,
    templateId: body.template_id,
    // @ts-expect-error
    template: templateIds[body.template_id],
  });

  await reply.send({
    data: {
      id: randomUUID(),
      reference: body.reference,
    },
  });
  return await reply;
}
