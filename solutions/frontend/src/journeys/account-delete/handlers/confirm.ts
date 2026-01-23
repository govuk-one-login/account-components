import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import { completeJourney } from "../../utils/completeJourney.js";
import { failedJourneyErrors } from "../../utils/failedJourneyErrors.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render("journeys/account-delete/templates/confirm.njk", options);
};

export async function confirmGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}

export async function confirmPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_management_api_access_token);
  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.account_management_api_access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.deleteAccount(
    request.session.claims.email,
  );

  if (!result.success) {
    type DeleteAccountError = (typeof result)["error"];
    const errorMap: Record<
      DeleteAccountError,
      (typeof failedJourneyErrors)[keyof typeof failedJourneyErrors]
    > = {
      RequestIsMissingParameters: failedJourneyErrors.tempErrorTODORemoveLater,
      AccountDoesNotExist: failedJourneyErrors.tempErrorTODORemoveLater,
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

    return await completeJourney(request, reply, errorMap[result.error], false);
  }

  return await completeJourney(request, reply, {}, true);
}
