import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import * as v from "valibot";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";
import {
  getFormErrorsFromValueAndSchema,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  assert.ok(reply.globals.buildRedirectToClientRedirectUri);

  await reply.render("journeys/passkey-create/templates/create.njk", {
    ...options,
    backLink: reply.globals.buildRedirectToClientRedirectUri(
      authorizeErrors.userAborted,
    ),
  });
};

export async function getHandler(request: FastifyRequest, reply: FastifyReply) {
  assert.ok(request.session.claims);
  assert.ok(reply.journeyStates?.["passkey-create"]);
  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_RP_NAME"]);

  const registrationOptions = await generateRegistrationOptions({
    rpName: process.env["PASSKEYS_RP_NAME"],
    rpID: process.env["PASSKEYS_RP_ID"],
    userName: request.session.claims.email,
    // TODO set other options?
  });

  reply.journeyStates["passkey-create"].send({
    type: "updateRegistrationOptions",
    registrationOptions,
  });

  await render(reply, { registrationOptions });
  return reply;
}

export async function postHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // TODO better error handling in this handler

  assert.ok(reply.journeyStates?.["passkey-create"]);

  const registrationOptions =
    reply.journeyStates["passkey-create"].getSnapshot().context
      .registrationOptions;
  assert.ok(registrationOptions);

  const bodySchema = v.object({
    registrationResponse: v.pipe(v.string()),
  });
  const bodyFormErrors = getFormErrorsFromValueAndSchema(
    request.body,
    bodySchema,
  );

  if (bodyFormErrors) {
    await render(reply, {
      errors: bodyFormErrors,
      errorList: getFormErrorsList(bodyFormErrors),
    });
    return reply;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const body = request.body as v.InferOutput<typeof bodySchema>;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const registrationResponse = JSON.parse(
    body.registrationResponse,
  ) as RegistrationResponseJSON;

  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_EXPECTED_ORIGIN"]);

  const verification = await verifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: registrationOptions.challenge,
    expectedOrigin: process.env["PASSKEYS_EXPECTED_ORIGIN"],
    expectedRPID: process.env["PASSKEYS_RP_ID"],
  });

  if (!verification.verified) {
    // TODO okay to log whole verification object here?
    request.log.error(verification, "Create passkey verification failed");
    throw new Error("Create passkey verification failed");
  }

  // TODO send passkey to account management API to save it (https://simplewebauthn.dev/docs/packages/server#3-post-registration-responsibilities)

  reply.journeyStates["passkey-create"].send({
    type: "created",
  });

  reply.redirect(paths.journeys["passkey-create"].CREATED.success.path);
  return reply;
}
