import * as v from "valibot";
import type { FastifyReply, FastifyRequest } from "fastify";
import { completeJourney } from "../utils/completeJourney.js";

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

  return await completeJourney(
    request,
    reply,
    {
      error: {
        code: params.error_code,
        description: params.error_description,
      },
    },
    false,
  );
};
