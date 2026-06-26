import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import {
  getFormErrors,
  checkValueForFormErrors,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";
import * as v from "valibot";
import { AccountManagementApiClient } from "../../../utils/accountManagementApiClient.js";
import { completeJourney } from "../../utils/completeJourney.js";
import {
  completeAllJourneyActionsUnsuccessfully,
  unsuccessfulJourneyActionErrors,
} from "../../utils/journeyActions.js";

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
    } else if (result.error === "ExceededIncorrectPasswordSubmissionLimit") {
      reply.journeyStates["account-delete"].send({
        type: "lockedOutPasswordEnteredTooManyTimes",
      });
      reply.redirect(
        paths.journeys["account-delete"]
          .LOCKED_OUT_PASSWORD_ENTERED_TOO_MANY_TIMES
          .lockedOutPasswordEnteredTooManyTimes.path,
      );
      return reply;
    } else if (result.error === "UserAccountSuspended") {
      await completeAllJourneyActionsUnsuccessfully(
        {
          ...unsuccessfulJourneyActionErrors.accountHasInterventions,
          extras: {
            accountInterventionsStatus: {
              state: {
                blocked: false,
                suspended: true,
              },
            },
          },
        },
        request,
        reply,
      );
      return await completeJourney(request, reply, false);
    } else if (result.error === "UserAccountBlocked") {
      await completeAllJourneyActionsUnsuccessfully(
        {
          ...unsuccessfulJourneyActionErrors.accountHasInterventions,
          extras: {
            accountInterventionsStatus: {
              state: {
                blocked: true,
                suspended: false,
              },
            },
          },
        },
        request,
        reply,
      );
      return await completeJourney(request, reply, false);
    }

    throw new Error(result.error);
  }

  reply.journeyStates["account-delete"].send({
    type: "authenticated",
  });

  reply.redirect(paths.journeys["account-delete"].AUTHENTICATED.confirm.path);
  return reply;
}
