import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import {
  getFormErrors,
  getFormErrorsFromValueAndSchema,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";
import * as v from "valibot";
import { AccountManagementApiClient } from "../../../../../commons/utils/accountManagementApiClient/index.js";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../../utils/redirectToClientRedirectUri.js";

const renderPage = async (reply: FastifyReply, options?: object) => {
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
  await renderPage(reply);
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
  const bodyFormErrors = getFormErrorsFromValueAndSchema(
    request.body,
    bodySchema,
  );

  if (bodyFormErrors) {
    await renderPage(reply, {
      errors: bodyFormErrors,
      errorList: getFormErrorsList(bodyFormErrors),
    });
    return reply;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const body = request.body as v.InferOutput<typeof bodySchema>;

  assert.ok(request.session.claims);
  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.access_token,
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

      await renderPage(reply, {
        errors: formErrors,
        errorList: getFormErrorsList(formErrors),
      });
      return reply;
    }

    type AuthenticateError = (typeof result)["error"];
    const errorMap: Record<
      Exclude<AuthenticateError, "InvalidLoginCredentials">,
      (typeof authorizeErrors)[keyof typeof authorizeErrors]
    > = {
      RequestIsMissingParameters: authorizeErrors.tempErrorTODORemoveLater,
      AccountDoesNotExist: authorizeErrors.tempErrorTODORemoveLater,
      UserAccountBlocked: authorizeErrors.tempErrorTODORemoveLater,
      UserAccountSuspended: authorizeErrors.tempErrorTODORemoveLater,
      AccountInterventionsUnexpectedError:
        authorizeErrors.tempErrorTODORemoveLater,
      ExceededIncorrectPasswordSubmissionLimit:
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

    return await redirectToClientRedirectUri(
      request,
      reply,
      request.session.claims.redirect_uri,
      errorMap[result.error],
      request.session.claims.state,
    );
  }

  reply.journeyStates["account-delete"].send({
    type: "authenticated",
  });

  reply.redirect(paths.journeys["account-delete"].AUTHENTICATED.confirm.path);
  return reply;
}
