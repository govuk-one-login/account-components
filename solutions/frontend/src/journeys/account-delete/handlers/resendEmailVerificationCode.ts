import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { handleSendOtpChallenge } from "../utils/handleSendOtpChallenge.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render(
    "journeys/account-delete/templates/resendEmailVerificationCode.njk",
    options,
  );
};

export async function resendEmailVerificationCodeGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply, {
    verifyCodeLinkUrl:
      paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress
        .path,
  });
  return reply;
}

export async function resendEmailVerificationCodePostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await handleSendOtpChallenge(request, reply);

  if (!result.success) {
    return reply;
  }

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
