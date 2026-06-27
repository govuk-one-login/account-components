import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { AccountManagementApiClient } from "../../../utils/accountManagementApiClient.js";
import { startJourneyAction } from "../../utils/journeyActions.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render(
    "journeys/account-delete/templates/introduction.njk",
    options,
  );
};

export async function introductionGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await startJourneyAction<"tempAccountDeleteAction">(
    { action: "temp-account-delete-action" },
    request,
    reply,
  );
  await render(reply);
  return reply;
}

export async function introductionPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_management_api_access_token);
  assert.ok(reply.journeyStates?.["account-delete"]);

  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.account_management_api_access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.sendOtpChallenge(
    request.session.claims.public_sub,
  );

  if (!result.success) {
    if (result.error === "TooManyEmailCodesEntered") {
      reply.journeyStates["account-delete"].send({
        type: "lockedOutSecurityCodeEnteredTooManyTimes",
      });
      reply.redirect(
        paths.journeys["account-delete"]
          .LOCKED_OUT_SECURITY_CODE_ENTERED_TOO_MANY_TIMES
          .lockedOutSecurityCodeEnteredTooManyTimes.path,
      );
      return reply;
    } else if (result.error === "BlockedForEmailVerificationCodes") {
      reply.journeyStates["account-delete"].send({
        type: "lockedOutSecurityCodeRequestedTooManyTimes",
      });
      reply.redirect(
        paths.journeys["account-delete"]
          .LOCKED_OUT_SECURITY_CODE_REQUESTED_TOO_MANY_TIMES
          .lockedOutSecurityCodeRequestedTooManyTimes.path,
      );
      return reply;
    }

    throw new Error(result.error);
  }

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
