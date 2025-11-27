import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";

export async function introductionGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  await reply.render("journeys/account-delete/templates/introduction.njk");
  return reply;
}

export async function introductionPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.access_token,
  );

  await accountManagementApiClient.sendOtpChallenge(
    request.session.claims.email,
  );

  // TODO perhaps handle send OTP error responses here in future

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
