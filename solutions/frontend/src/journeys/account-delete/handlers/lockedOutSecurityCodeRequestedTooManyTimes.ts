import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render(
    "journeys/account-delete/templates/lockedOutSecurityCodeRequestedTooManyTimes.njk",
    options,
  );
};

export async function lockedOutSecurityCodeRequestedTooManyTimesGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}
