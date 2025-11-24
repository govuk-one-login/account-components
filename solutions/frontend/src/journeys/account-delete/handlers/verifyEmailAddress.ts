import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";

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
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.journeyStates?.["account-delete"]);

  // TODO validation and error messages

  // TODO verify OTP and handler errors

  reply.journeyStates["account-delete"].send({
    type: "emailVerified",
  });

  reply.redirect(paths.journeys["account-delete"].EMAIL_VERIFIED.TODO.path);
  return reply;
}
