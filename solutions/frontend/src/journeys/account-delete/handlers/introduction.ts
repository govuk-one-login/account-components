import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";

export async function introductionGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  await reply.render("journeys/account-delete/templates/introduction.njk");
  return reply;
}

export async function introductionPostHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // TODO send OTP here and handle errors

  reply.redirect(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
  );
  return reply;
}
