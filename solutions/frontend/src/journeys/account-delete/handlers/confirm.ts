import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../../utils/redirectToClientRedirectUri.js";
import { completeJourney } from "../../utils/completeJourney.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render("journeys/account-delete/templates/confirm.njk", {
    contactUrl: process.env["CONTACT_URL"],
    ...options,
  });
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
  assert.ok(reply.journeyStates?.["account-delete"]);

  assert.ok(request.session.claims);
  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.deleteAccount(
    request.session.claims.email,
  );

  if (!result.success) {
    type DeleteAccountError = (typeof result)["error"];
    const errorMap: Record<
      DeleteAccountError,
      (typeof authorizeErrors)[keyof typeof authorizeErrors]
    > = {
      RequestIsMissingParameters: authorizeErrors.tempErrorTODORemoveLater,
      AccountDoesNotExist: authorizeErrors.tempErrorTODORemoveLater,
      ErrorValidatingResponseBody: authorizeErrors.tempErrorTODORemoveLater,
      ErrorParsingResponseBodyJson: authorizeErrors.tempErrorTODORemoveLater,
      ErrorValidatingErrorResponseBody:
        authorizeErrors.tempErrorTODORemoveLater,
      ErrorParsingErrorResponseBodyJson:
        authorizeErrors.tempErrorTODORemoveLater,
      UnknownErrorResponse: authorizeErrors.tempErrorTODORemoveLater,
      UnknownError: authorizeErrors.tempErrorTODORemoveLater,
    };

    return await redirectToClientRedirectUri(
      request,
      reply,
      request.session.claims.redirect_uri,
      errorMap[result.error],
      request.session.claims.state,
    );
  }

  return await completeJourney(request, reply, request.session.claims, [
    {
      accountDeleted: true,
    },
  ]);
}
