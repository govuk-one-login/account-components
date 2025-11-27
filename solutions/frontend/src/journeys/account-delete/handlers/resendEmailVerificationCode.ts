import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";

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
