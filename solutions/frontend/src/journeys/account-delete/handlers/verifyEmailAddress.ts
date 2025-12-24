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
import { getAnalyticsSettings } from "../utils/getAnalyticsSettings.js";

const renderPage = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options?: object,
) => {
  assert.ok(reply.render);
  assert.ok(request.session.claims);

  reply.analytics = getAnalyticsSettings({
    contentId: "TODO",
  });
  await reply.render(
    "journeys/account-delete/templates/verifyEmailAddress.njk",
    {
      ...options,
      resendCodeLinkUrl:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
          .resendEmailVerificationCode.path,
      emailAddress: request.session.claims.email,
      backLink:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.introduction.path,
    },
  );
};

export async function verifyEmailAddressGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await renderPage(request, reply);
  return reply;
}

export async function verifyEmailAddressPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.journeyStates?.["account-delete"]);

  const bodySchema = v.object({
    code: v.pipe(
      v.string(),
      v.minLength(
        1,
        request.i18n.t("journey:verifyEmailAddress.formErrors.empty"),
      ),
      v.length(
        6,
        request.i18n.t("journey:verifyEmailAddress.formErrors.tooShort"),
      ),
      v.digits(
        request.i18n.t("journey:verifyEmailAddress.formErrors.notAllDigits"),
      ),
    ),
  });
  const bodyFormErrors = getFormErrorsFromValueAndSchema(
    request.body,
    bodySchema,
  );

  if (bodyFormErrors) {
    await renderPage(request, reply, {
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

  const result = await accountManagementApiClient.verifyOtpChallenge(
    request.session.claims.public_sub,
    body.code,
  );

  if (!result.success) {
    if (result.error === "InvalidOTPCode") {
      const formErrors = getFormErrors([
        {
          msg: request.i18n.t(
            "journey:verifyEmailAddress.formErrors.incorrect",
          ),
          fieldId: "code",
        },
      ]);

      await renderPage(request, reply, {
        errors: formErrors,
        errorList: getFormErrorsList(formErrors),
      });
      return reply;
    }

    type SendOtpChallengeError = (typeof result)["error"];
    const errorMap: Record<
      Exclude<SendOtpChallengeError, "InvalidOTPCode">,
      (typeof authorizeErrors)[keyof typeof authorizeErrors]
    > = {
      RequestIsMissingParameters: authorizeErrors.tempErrorTODORemoveLater,
      TooManyEmailCodesEntered: authorizeErrors.tempErrorTODORemoveLater,
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
    type: "notAuthenticated",
  });

  reply.redirect(
    paths.journeys["account-delete"].NOT_AUTHENTICATED.enterPassword.path,
  );
  return reply;
}
