import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { completeJourney } from "../../utils/completeJourney.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render("journeys/passkey-create/templates/success.njk", options);
};

export async function getHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}

export async function postHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);

  return await completeJourney(request, reply, request.session.claims);
}
