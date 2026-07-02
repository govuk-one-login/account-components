import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { startJourneyAction } from "../../utils/journeyActions.js";
import { sharedSendOtpHandler } from "../utils/sharedSendOtpHandler.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render(
    "journeys/account-delete/templates/introduction.njk",
    options,
  );
};

export async function introductionGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await startJourneyAction<"tempAccountDeleteAction">(
    { action: "temp-account-delete-action" },
    request,
    reply,
  );
  await render(reply);
  return reply;
}

export async function introductionPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return await sharedSendOtpHandler(request, reply);
}
