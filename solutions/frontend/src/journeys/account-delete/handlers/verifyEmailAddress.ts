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

const render = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options?: object,
) => {
  assert.ok(reply.render);
  assert.ok(request.session.claims?.email);

  await reply.render(
    "journeys/account-delete/templates/verifyEmailAddress.njk",
    {
      resendCodeLinkUrl:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
          .resendEmailVerificationCode.path,
      emailAddress: request.session.claims.email,
      backLink:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.introduction.path,
      ...options,
    },
  );
};

export async function verifyEmailAddressGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(request, reply);
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
  const bodyValidation = checkValueForFormErrors(request.body, bodySchema);

  if (!bodyValidation.success) {
    await render(request, reply, {
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

      await render(request, reply, {
        errors: formErrors,
        errorList: getFormErrorsList(formErrors),
      });
      return reply;
    }

    type SendOtpChallengeError = (typeof result)["error"];
    const errorMap: Record<
      Exclude<SendOtpChallengeError, "InvalidOTPCode">,
      (typeof failedJourneyErrors)[keyof typeof failedJourneyErrors]
    > = {
      RequestIsMissingParameters: failedJourneyErrors.tempErrorTODORemoveLater,
      TooManyEmailCodesEntered: failedJourneyErrors.tempErrorTODORemoveLater,
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
    type: "notAuthenticated",
  });

  reply.redirect(
    paths.journeys["account-delete"].NOT_AUTHENTICATED.enterPassword.path,
  );
  return reply;
}
