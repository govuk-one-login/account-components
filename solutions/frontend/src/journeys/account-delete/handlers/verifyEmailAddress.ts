import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import {
  getFormErrorsFromValueAndSchema,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";
import * as v from "valibot";
import type { FastifySessionObject } from "@fastify/session";

const getRenderOptions = (claims: FastifySessionObject["claims"]) => {
  assert.ok(claims?.email);

  return {
    resendCodeLinkUrl:
      paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
        .resendEmailVerificationCode.path,
    emailAddress: claims.email,
  };
};

export async function verifyEmailAddressGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  await reply.render(
    "journeys/account-delete/templates/verifyEmailAddress.njk",
    getRenderOptions(request.session.claims),
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
        ...getRenderOptions(request.session.claims),
      },
    );
  };

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
