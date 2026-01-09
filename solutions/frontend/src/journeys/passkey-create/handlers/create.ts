import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import * as v from "valibot";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render("journeys/passkey-create/templates/create.njk", options);
};

export async function getHandler(request: FastifyRequest, reply: FastifyReply) {
  assert.ok(request.session.claims);
  assert.ok(reply.journeyStates?.["passkey-create"]);
  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_RP_NAME"]);

  const registrationOptions = await generateRegistrationOptions({
    rpName: process.env["PASSKEYS_RP_NAME"],
    rpID: process.env["PASSKEYS_RP_ID"],
    userName: request.session.claims.sub, // TODOp is this the right value to use here?
    // TODOp set other options?
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
  assert.ok(reply.journeyStates?.["passkey-create"]);

  const registrationOptions =
    reply.journeyStates["passkey-create"].getSnapshot().context
      .registrationOptions;
  assert.ok(registrationOptions);

  const body = v.parse(
    v.object({ registrationResponse: v.string() }),
    request.body,
  );

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
    // TODOp okay to log whole verification object here?
    request.log.error(verification, "Create passkey verification failed");
    throw new Error("Create passkey verification failed");
  }

  // TODOp send passkey to account management API to save it (https://simplewebauthn.dev/docs/packages/server#3-post-registration-responsibilities)

  reply.journeyStates["passkey-create"].send({
    type: "created",
  });

  reply
    .header("Content-Type", "application/json")
    .send({ goTo: paths.journeys["passkey-create"].CREATED.success.path });
  return reply;
}
