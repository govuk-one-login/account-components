import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import {
  getFormErrorsFromValueAndSchema,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";
import * as v from "valibot";

export async function verifyEmailAddressGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  await reply.render(
    "journeys/account-delete/templates/verifyEmailAddress.njk",
    {
      resendCodeLinkUrl:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
          .resendEmailVerificationCode.path,
    },
  );
  return reply;
}

export async function verifyEmailAddressPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.journeyStates?.["account-delete"]);

  const renderPage = async (options: object) => {
    assert.ok(reply.render);

    await reply.render(
      "journeys/account-delete/templates/verifyEmailAddress.njk",
      {
        ...options,
        resendCodeLinkUrl:
          paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
            .resendEmailVerificationCode.path,
      },
    );
  };

  const bodySchema = v.object(
    {
      code: v.pipe(
        v.string("TODO mustBeAString"),
        v.minLength(1, "TODO mustNotBeEmpty"),
        v.length(6, "TODO mustBe6Chars"),
        v.digits("TODO mustBeAllDigits"),
      ),
    },
    //"TODO mustBeAnObject",
  );
  const bodyFormErrors = getFormErrorsFromValueAndSchema(
    request.body,
    bodySchema,
  );

  if (bodyFormErrors) {
    await renderPage({
      errors: bodyFormErrors,
      errorList: getFormErrorsList(bodyFormErrors),
    });
    return reply;
  }

  // TODO verify OTP and handler errors

  reply.journeyStates["account-delete"].send({
    type: "emailVerified",
  });

  reply.redirect(paths.journeys["account-delete"].EMAIL_VERIFIED.TODO.path);
  return reply;
}
