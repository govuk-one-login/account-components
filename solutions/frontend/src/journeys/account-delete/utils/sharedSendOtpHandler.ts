import type { FastifyReply, FastifyRequest } from "fastify";
import assert from "node:assert";
import { AccountManagementApiClient } from "../../../utils/accountManagementApiClient.js";
import { paths } from "../../../utils/paths.js";
import { Scope } from "../../../../../commons/utils/commonTypes.js";

export async function sharedSendOtpHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  assert.ok(reply.journeyStates?.[Scope.accountDelete]);

  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.account_management_api_access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.sendOtpChallenge(
    request.session.claims.public_sub,
  );

  if (!result.success) {
    if (result.error === "TooManyEmailCodesEntered") {
      reply.journeyStates[Scope.accountDelete].send({
        type: "lockedOutSecurityCodeEnteredTooManyTimes",
      });
      reply.redirect(
        paths.journeys["account-delete"]
          .LOCKED_OUT_SECURITY_CODE_ENTERED_TOO_MANY_TIMES
          .lockedOutSecurityCodeEnteredTooManyTimes.path,
      );
      return reply;
    } else if (result.error === "BlockedForEmailVerificationCodes") {
      reply.journeyStates[Scope.accountDelete].send({
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
