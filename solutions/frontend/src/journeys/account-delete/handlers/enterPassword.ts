import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import {
  getFormErrors,
  checkValueForFormErrors,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";
import * as v from "valibot";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import { failedJourneyErrors } from "../../utils/failedJourneyErrors.js";
import { completeJourney } from "../../utils/completeJourney.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render(
    "journeys/account-delete/templates/enterPassword.njk",
    options,
  );
};

export async function enterPasswordGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}

export async function enterPasswordPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.journeyStates?.["account-delete"]);

  const bodySchema = v.object({
    password: v.pipe(
      v.string(),
      v.minLength(1, request.i18n.t("journey:enterPassword.formErrors.empty")),
    ),
  });
  const bodyValidation = checkValueForFormErrors(request.body, bodySchema);

  if (!bodyValidation.success) {
    await render(reply, {
      errors: bodyValidation.formErrors,
      errorList: getFormErrorsList(bodyValidation.formErrors),
    });
    return reply;
  }

  const body = bodyValidation.parsedValue;

  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_management_api_access_token);
  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.account_management_api_access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.authenticate(
    request.session.claims.email,
    body.password,
  );

  if (!result.success) {
    if (result.error === "InvalidLoginCredentials") {
      const formErrors = getFormErrors([
        {
          msg: request.i18n.t("journey:enterPassword.formErrors.incorrect"),
          fieldId: "password",
        },
      ]);

      await render(reply, {
        errors: formErrors,
        errorList: getFormErrorsList(formErrors),
      });
      return reply;
    }

    type AuthenticateError = (typeof result)["error"];
    const errorMap: Record<
      Exclude<AuthenticateError, "InvalidLoginCredentials">,
      (typeof failedJourneyErrors)[keyof typeof failedJourneyErrors]
    > = {
      RequestIsMissingParameters: failedJourneyErrors.tempErrorTODORemoveLater,
      AccountDoesNotExist: failedJourneyErrors.tempErrorTODORemoveLater,
      UserAccountBlocked: failedJourneyErrors.tempErrorTODORemoveLater,
      UserAccountSuspended: failedJourneyErrors.tempErrorTODORemoveLater,
      AccountInterventionsUnexpectedError:
        failedJourneyErrors.tempErrorTODORemoveLater,
      ExceededIncorrectPasswordSubmissionLimit:
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

    return await completeJourney(request, reply, errorMap[result.error], false);
  }

  reply.journeyStates["account-delete"].send({
    type: "authenticated",
  });

  reply.redirect(paths.journeys["account-delete"].AUTHENTICATED.confirm.path);
  return reply;
}
