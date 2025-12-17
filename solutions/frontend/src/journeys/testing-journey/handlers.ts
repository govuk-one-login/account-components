import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { paths } from "../../utils/paths.js";
import { completeJourney } from "../utils/completeJourney.js";

export async function step1GetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);
  await reply.render("journeys/testing-journey/step1.njk");
  return reply;
}

export async function step1PostHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  reply.redirect(
    paths.journeys["testing-journey"].PASSWORD_NOT_PROVIDED.enterPassword.path,
  );
  return reply;
}

export async function enterPasswordGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);
  await reply.render("journeys/testing-journey/enterPassword.njk", {
    backLink:
      paths.journeys["testing-journey"].PASSWORD_NOT_PROVIDED.step1.path,
  });
  return reply;
}

export async function enterPasswordPostHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.journeyStates?.["testing-journey"]);

  reply.journeyStates["testing-journey"].send({
    type: "passwordEntered",
  });

  reply.redirect(
    paths.journeys["testing-journey"].PASSWORD_PROVIDED.confirm.path,
  );
  return reply;
}

export async function confirmGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.render);
  await reply.render("journeys/testing-journey/confirm.njk");
  return reply;
}

export async function confirmPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  return await completeJourney(request, reply, request.session.claims, [
    {
      testingJourneyComplete: true,
    },
  ]);
}
