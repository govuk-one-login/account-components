import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { handleSendOtpChallenge } from "../utils/handleSendOtpChallenge.js";
import { getAnalyticsSettings } from "../utils/getAnalyticsSettings.js";

export async function resendEmailVerificationCodeGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  reply.analytics = getAnalyticsSettings({
    contentId: "TODO",
  });
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
