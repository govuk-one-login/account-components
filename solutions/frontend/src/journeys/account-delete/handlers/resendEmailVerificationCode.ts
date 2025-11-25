import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";

export async function resendEmailVerificationCodeGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  await reply.render(
    "journeys/account-delete/templates/resendEmailVerificationCode.njk",
    {
      verifyCodeLinkUrl:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress
          .path,
    },
  );
  return reply;
}

export async function resendEmailVerificationCodePostHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // TODO send OTP here and handle errors

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
