import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../../utils/redirectToClientRedirectUri.js";

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

  const result = await accountManagementApiClient.sendOtpChallenge(
    request.session.claims.email,
  );

  if (!result.success) {
    type SendOtpChallengeError = (typeof result)["error"];
    const errorMap: Record<
      SendOtpChallengeError,
      (typeof authorizeErrors)[keyof typeof authorizeErrors]
    > = {
      RequestIsMissingParameters: authorizeErrors.userAborted, // TODO
      BlockedForEmailVerificationCodes: authorizeErrors.userAborted, // TODO
      TooManyEmailCodesEntered: authorizeErrors.userAborted, // TODO
      InvalidPrincipalInRequest: authorizeErrors.userAborted, // TODO
      AccountManagementApiUnexpectedError: authorizeErrors.userAborted, // TODO
      ErrorParsingResponseBody: authorizeErrors.userAborted, // TODO
      UnknownError: authorizeErrors.userAborted, // TODO
    };

    return await redirectToClientRedirectUri(
      request,
      reply,
      request.session.claims.redirect_uri,
      errorMap[result.error],
      request.session.claims.state,
    );
  }

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
