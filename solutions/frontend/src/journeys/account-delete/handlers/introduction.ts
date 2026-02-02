import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { AccountManagementApiClient } from "../../../utils/accountManagementApiClient.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render(
    "journeys/account-delete/templates/introduction.njk",
    options,
  );
};

export async function introductionGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}

export async function introductionPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_management_api_access_token);

  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.account_management_api_access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.sendOtpChallenge(
    request.session.claims.public_sub,
  );

  if (!result.success) {
    if (result.error === "TooManyEmailCodesEntered") {
      // TODO need to do something in this case?
    } else if (result.error === "BlockedForEmailVerificationCodes") {
      // TODO need to do something in this case?
    }

    throw new Error(result.error);
  }

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
