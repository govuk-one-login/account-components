import type { FastifyReply, FastifyRequest } from "fastify";
import { paths } from "../../utils/paths.js";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { journeys } from "./config.js";
import { createActor } from "xstate";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import assert from "node:assert";
import { redirectToAuthorizeErrorPage } from "../../utils/redirectToAuthorizeErrorPage.js";
import { logger } from "../../../../commons/utils/logger/index.js";
import type { failedJourneyErrors } from "./failedJourneyErrors.js";

export const onRequest = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.session.claims) {
    request.log.warn("NoClaimsInSession");
    metrics.addMetric("NoClaimsInSession", MetricUnit.Count, 1);
    return await redirectToAuthorizeErrorPage(request, reply);
  }

  const claims = request.session.claims;

  metrics.addDimensions({ client_id: claims.client_id, scope: claims.scope });
  logger.appendKeys({
    client_id: claims.client_id,
    scope: claims.scope,
  });

  const clientRegistry = await getClientRegistry();
  const client = clientRegistry.find(
    (client) => client.client_id === claims.client_id,
  );

  if (!client) {
    request.log.warn(
      {
        client_id: claims.client_id,
      },
      "ClientNotFound",
    );
    metrics.addMetric("ClientNotFound", MetricUnit.Count, 1);
    return await redirectToAuthorizeErrorPage(request, reply);
  }

  reply.client = client;
  reply.globals.buildCompleteFailedJourneyUri = (
    error: (typeof failedJourneyErrors)[keyof typeof failedJourneyErrors],
  ) => {
    const url = new URL(
      paths.journeys.others.completeFailedJourney.path,
      "http://localhost",
    );
    url.searchParams.set("error_code", error.code.toString());
    url.searchParams.set("error_description", error.description);
    return url.pathname + url.search;
  };

  const journey = await journeys[claims.scope]();

  const missingRequiredClaims = journey.requiredClaims.filter((claim) => {
    return claims[claim] === undefined;
  });

  if (missingRequiredClaims.length) {
    request.log.warn(
      {
        missingRequiredClaims,
      },
      "RequiredClaimsMissing",
    );
    metrics.addMetric("RequiredClaimsMissing", MetricUnit.Count, 1);
    return await redirectToAuthorizeErrorPage(request, reply);
  }

  Object.entries(journey.translations).forEach(([lang, translations]) => {
    request.i18n.addResourceBundle(lang, "journey", translations);
  });

  const journeyStateMachine = journey.stateMachine;

  const serializedSnapshot = request.session.journeyStateSnapshot;

  const actor = createActor(
    journeyStateMachine,
    serializedSnapshot
      ? {
          snapshot: journeyStateMachine.resolveState(serializedSnapshot),
        }
      : {},
  );

  actor.start();

  /*
      There are lots of eslint-disable and @ts-expect-error comments here because of the
      fact the types for AnyActor in xstate are annoyingly really broad.
    */

  const currentState = actor.getSnapshot().value;

  /* eslint-disable @typescript-eslint/no-unsafe-argument */
  const pathsForCurrentState = Object.values(
    // @ts-expect-error
    paths.journeys[claims.scope][currentState],
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  ).map((val) => val.path as string);
  /* eslint-enable @typescript-eslint/no-unsafe-argument */

  assert.ok(pathsForCurrentState[0], "pathsForCurrentState has no entries");

  const pathObjectForCurrentState = Object.values(
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    paths.journeys[claims.scope][currentState],
  ).find((val) => {
    assert.ok(
      reply.globals.currentUrl?.pathname,
      "reply.globals.currentUrl is not defined",
    );
    // @ts-expect-error
    return val.path === reply.globals.currentUrl.pathname;
  });

  const otherJourneyPathObject = Object.values(paths.journeys.others).find(
    (val) => {
      assert.ok(
        reply.globals.currentUrl?.pathname,
        "reply.globals.currentUrl is not defined",
      );
      return val.path === reply.globals.currentUrl.pathname;
    },
  );

  if (!pathObjectForCurrentState && !otherJourneyPathObject) {
    reply.redirect(pathsForCurrentState[0]);
    return await reply;
  }

  if (pathObjectForCurrentState) {
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    reply.analytics = pathObjectForCurrentState.analytics;
  } else if (otherJourneyPathObject) {
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    reply.analytics = otherJourneyPathObject.analytics;
  }

  reply.journeyStates = {
    ...reply.journeyStates,
    [claims.scope]: actor,
  };
};
