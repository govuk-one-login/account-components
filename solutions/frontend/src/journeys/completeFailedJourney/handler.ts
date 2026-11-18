import * as v from "valibot";
import type { FastifyReply, FastifyRequest } from "fastify";
import { completeJourney } from "../utils/completeJourney.js";
import {
  completeAllJourneyActionsUnsuccessfully,
  simpleUnsuccessfulJourneyActionErrors,
} from "../utils/journeyActions.js";
import assert from "node:assert";
import { Scope } from "../../../../commons/utils/commonTypes.js";

export const completeFailedJourneyHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const params = v.parse(
    v.object({
      error_code: v.pipe(
        v.string(),
        v.transform(Number.parseInt),
        v.number(),
        v.integer(),
        v.minValue(1),
      ),
      error_description: v.pipe(v.string(), v.minLength(1)),
    }),
    request.method === "GET" ? request.query : request.body,
  );

  const unsuccessfulActionError = Object.values(
    simpleUnsuccessfulJourneyActionErrors,
  ).find(
    (error) =>
      error.code === params.error_code &&
      error.description === params.error_description,
  );

  assert.ok(unsuccessfulActionError, "Error not found");

  if (request.session.claims?.scope === Scope.passkeyCreate) {
    if (unsuccessfulActionError.description === "UserAbortedJourney") {
      request.log.info("Skipped from set up passkey screen");
    } else if (
      unsuccessfulActionError.description === "UserBackedOutOfJourney"
    ) {
      request.log.info("Backed out from set up passkey screen");
    }
  }

  await completeAllJourneyActionsUnsuccessfully(
    unsuccessfulActionError,
    request,
    reply,
  );

  return await completeJourney(request, reply, false);
};
