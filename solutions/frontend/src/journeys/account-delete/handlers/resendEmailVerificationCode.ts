import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { sharedSendOtpHandler } from "../utils/sharedSendOtpHandler.js";

const render = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options?: object,
) => {
  assert.ok(reply.render);
  assert.ok(request.session.claims?.email);

  await reply.render(
    "journeys/account-delete/templates/resendEmailVerificationCode.njk",
    {
      emailAddress: request.session.claims.email,
      backLink:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress
          .path,
      ...options,
    },
  );
};

export async function resendEmailVerificationCodeGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(request, reply);
  return reply;
}

export async function resendEmailVerificationCodePostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return await sharedSendOtpHandler(request, reply);
}
