import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render("journeys/passkey-create/templates/introduction.njk", {
    backLink: "TODO",
    ...options,
  });
};

export async function introductionGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}
