import * as v from "valibot";
import type { FastifyReply, FastifyRequest } from "fastify";
import { completeJourney } from "../utils/completeJourney.js";
import {
  completeJourneyActionUnsuccessfully,
  journeyActionNames,
  unsuccessfulJourneyActionErrors,
} from "../utils/journeyActions.js";
import assert from "node:assert";

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
    unsuccessfulJourneyActionErrors,
  ).find(
    (error) =>
      error.code === params.error_code &&
      error.description === params.error_description,
  );

  assert.ok(unsuccessfulActionError, "Error not found");

  assert.ok(
    !!request.session.journeyActions?.length,
    "There are no journey actions",
  );

  for (const journeyAction of request.session.journeyActions) {
    if (!("success" in journeyAction)) {
      const journeyActionName = Object.values(journeyActionNames).find(
        (name) => name === journeyAction.action,
      );

      assert.ok(journeyActionName, "Action not found");

      await completeJourneyActionUnsuccessfully(
        {
          action: journeyActionName,
          error: unsuccessfulActionError,
        },
        request,
        reply,
      );
    }
  }

  return await completeJourney(request, reply, false);
};
