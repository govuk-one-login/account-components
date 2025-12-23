import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { handleSendOtpChallenge } from "../utils/handleSendOtpChallenge.js";
import { getAnalyticsSettings } from "../utils/getAnalyticsSettings.js";

export async function introductionGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);
  assert.ok(reply.client);

  reply.analytics = getAnalyticsSettings({
    contentId: "TODO",
    loggedInStatus: reply.client.consider_user_logged_in,
  });
  await reply.render("journeys/account-delete/templates/introduction.njk");
  return reply;
}

export async function introductionPostHandler(
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
