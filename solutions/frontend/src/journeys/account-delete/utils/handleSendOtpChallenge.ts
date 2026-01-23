import { type FastifyReply, type FastifyRequest } from "fastify";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import assert from "node:assert";
import { failedJourneyErrors } from "../../utils/failedJourneyErrors.js";
import { completeJourney } from "../../utils/completeJourney.js";

export async function handleSendOtpChallenge(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ success: boolean }> {
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
    type SendOtpChallengeError = (typeof result)["error"];
    const errorMap: Record<
      SendOtpChallengeError,
      (typeof failedJourneyErrors)[keyof typeof failedJourneyErrors]
    > = {
      RequestIsMissingParameters: failedJourneyErrors.tempErrorTODORemoveLater,
      BlockedForEmailVerificationCodes:
        failedJourneyErrors.tempErrorTODORemoveLater,
      TooManyEmailCodesEntered: failedJourneyErrors.tempErrorTODORemoveLater,
      InvalidPrincipalInRequest: failedJourneyErrors.tempErrorTODORemoveLater,
      AccountManagementApiUnexpectedError:
        failedJourneyErrors.tempErrorTODORemoveLater,
      ErrorValidatingResponseBody: failedJourneyErrors.tempErrorTODORemoveLater,
      ErrorParsingResponseBodyJson:
        failedJourneyErrors.tempErrorTODORemoveLater,
      ErrorValidatingErrorResponseBody:
        failedJourneyErrors.tempErrorTODORemoveLater,
      ErrorParsingErrorResponseBodyJson:
        failedJourneyErrors.tempErrorTODORemoveLater,
      UnknownErrorResponse: failedJourneyErrors.tempErrorTODORemoveLater,
      UnknownError: failedJourneyErrors.tempErrorTODORemoveLater,
    };

    await completeJourney(request, reply, errorMap[result.error], false);

    return { success: false };
  }

  return { success: true };
}
