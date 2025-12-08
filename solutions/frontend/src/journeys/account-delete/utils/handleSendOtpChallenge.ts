import { type FastifyReply, type FastifyRequest } from "fastify";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../../utils/redirectToClientRedirectUri.js";
import assert from "node:assert";

export async function handleSendOtpChallenge(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ success: boolean }> {
  assert.ok(request.session.claims);

  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.access_token,
    request.awsLambda?.event,
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
      RequestIsMissingParameters: authorizeErrors.tempErrorTODORemoveLater,
      BlockedForEmailVerificationCodes:
        authorizeErrors.tempErrorTODORemoveLater,
      TooManyEmailCodesEntered: authorizeErrors.tempErrorTODORemoveLater,
      InvalidPrincipalInRequest: authorizeErrors.tempErrorTODORemoveLater,
      AccountManagementApiUnexpectedError:
        authorizeErrors.tempErrorTODORemoveLater,
      ErrorValidatingResponseBody: authorizeErrors.tempErrorTODORemoveLater,
      ErrorParsingResponseBodyJson: authorizeErrors.tempErrorTODORemoveLater,
      ErrorValidatingErrorResponseBody:
        authorizeErrors.tempErrorTODORemoveLater,
      ErrorParsingErrorResponseBodyJson:
        authorizeErrors.tempErrorTODORemoveLater,
      UnknownErrorResponse: authorizeErrors.tempErrorTODORemoveLater,
      UnknownError: authorizeErrors.tempErrorTODORemoveLater,
    };

    await redirectToClientRedirectUri(
      request,
      reply,
      request.session.claims.redirect_uri,
      errorMap[result.error],
      request.session.claims.state,
    );

    return { success: false };
  }

  return { success: true };
}
