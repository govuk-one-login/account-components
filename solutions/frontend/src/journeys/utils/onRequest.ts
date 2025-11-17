import type { FastifyReply, FastifyRequest } from "fastify";
import { paths } from "../../utils/paths.js";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import * as v from "valibot";
import type { createJourneyStateMachine } from "./index.js";
import { journeys } from "./index.js";
import { getClaimsSchema } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import type { Actor } from "xstate";
import { createActor } from "xstate";
import assert from "node:assert";

const redirectToErrorPage = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  await request.session.destroy();
  reply.redirect(paths.authorizeError);
  return reply;
};

// TODO comment the steps in this function?

export const onRequest = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.session.claims) {
    request.log.warn("NoClaimsInSession");
    metrics.addMetric("NoClaimsInSession", MetricUnit.Count, 1);
    return await redirectToErrorPage(request, reply);
  }

  const claimsSchema = getClaimsSchema();

  const claimsResult = v.safeParse(claimsSchema, request.session.claims, {
    abortEarly: false,
  });

  if (!claimsResult.success) {
    request.log.warn(
      {
        claims_with_issues: claimsResult.issues.map((issue) =>
          v.getDotPath(issue),
        ),
      },
      "InvalidClaimsInSession",
    );
    metrics.addMetric("InvalidClaimsInSession", MetricUnit.Count, 1);
    return await redirectToErrorPage(request, reply);
  }

  const claims = claimsResult.output;

  const serializedSnapshot =
    request.session.journeyStateMachines?.[claims.scope];

  let actor: Actor<ReturnType<typeof createJourneyStateMachine>>;

  if (serializedSnapshot) {
    try {
      const snapshot = journeys[claims.scope].resolveState(serializedSnapshot);
      snapshot.context = {
        ...snapshot.context,
        isRestored: true,
      };
      actor = createActor(journeys[claims.scope], {
        snapshot,
      });
    } catch (error) {
      request.log.warn({ error }, "TODO");
      metrics.addMetric("TODO", MetricUnit.Count, 1);
      // TODO redirect to callback, update public api doc
      return;
    }
  } else {
    actor = createActor(journeys[claims.scope]);
    const snapshot = actor.getSnapshot();
    snapshot.context = {
      ...snapshot.context,
      isRestored: false,
    };
    actor = createActor(journeys[claims.scope], {
      snapshot,
    });
  }

  if (actor.id !== claims.scope.toString()) {
    request.log.warn({ actorId: actor.id, claimsScope: claims.scope }, "TODO");
    metrics.addMetric("TODO", MetricUnit.Count, 1);
    // TODO redirect to callback, update public api doc, destroy session
    return;
  }

  actor.start();

  // TODO check that the current state node has a meta.path property and that it is
  // an allowed path for the journey

  assert.ok(reply.globals.currentUrl, "reply.globals.currentUrl is not set");

  // TODO check that the current state node's meta.path property matches the current URL
  // if not then redirect to the URL for the state node which does match the path
  // if there is no state node which matches the path then handle error

  reply.journeyStateMachines = {
    ...reply.journeyStateMachines,
    [claims.scope]: actor,
  };

  return reply;
};
