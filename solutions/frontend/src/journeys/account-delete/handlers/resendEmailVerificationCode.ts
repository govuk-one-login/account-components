import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../../utils/paths.js";
import { introductionPostHandler } from "./introduction.js";

const render = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options?: object,
) => {
  assert.ok(reply.render);
  assert.ok(request.session.claims?.email);

  await reply.render(
    "journeys/account-delete/templates/resendEmailVerificationCode.njk",
    {
      emailAddress: request.session.claims.email,
      backLink:
        paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress
          .path,
      ...options,
    },
  );
};

export async function resendEmailVerificationCodeGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(request, reply);
  return reply;
}

export async function resendEmailVerificationCodePostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Only make use of introductionPostHandler whilst this handler
  // contains no different logic. If this handler needs to have
  // different logic to introductionPostHandler then don't call
  // introductionPostHandler and add the logic directly in this
  // handler.
  return await introductionPostHandler(request, reply);
}
