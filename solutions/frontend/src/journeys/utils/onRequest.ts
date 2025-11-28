import type { FastifyReply, FastifyRequest } from "fastify";
import { paths } from "../../utils/paths.js";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { journeys } from "./config.js";
import type { AnyActor } from "xstate";
import { createActor } from "xstate";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";
import assert from "node:assert";
import { redirectToClientRedirectUri } from "../../utils/redirectToClientRedirectUri.js";
import { redirectToAuthorizeErrorPage } from "../../utils/redirectToAuthorizeErrorPage.js";
import { getRedirectToClientRedirectUri } from "../../../../commons/utils/authorize/getRedirectToClientRedirectUri.js";

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

  metrics.addDimensions({ client_id: claims.client_id });

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
  reply.globals.exitJourneyUrl = getRedirectToClientRedirectUri(
    paths.journeys.others.goToClientCallback.path,
    authorizeErrors.userAborted,
    claims.state,
    undefined,
  );

  const journey = await journeys[claims.scope]();

  Object.entries(journey.translations).forEach(([lang, translations]) => {
    request.i18n.addResourceBundle(lang, "journey", translations);
  });

  const journeyStateMachine = journey.stateMachine;

  const serializedSnapshot = request.session.journeyStateSnapshot;

  let actor: AnyActor;

  try {
    actor = createActor(
      journeyStateMachine,
      serializedSnapshot
        ? {
            snapshot: journeyStateMachine.resolveState(serializedSnapshot),
          }
        : {},
    );
  } catch (error) {
    request.log.warn({ error }, "FailedToCreateStateMachineActor");
    metrics.addMetric("FailedToCreateStateMachineActor", MetricUnit.Count, 1);
    return await redirectToClientRedirectUri(
      request,
      reply,
      claims.redirect_uri,
      authorizeErrors.failedToCreateStateMachineActor,
      claims.state,
    );
  }

  actor.start();

  try {
    /*
      There are lots of eslint-disable and @ts-expect-error comments here because of the
      fact the types for AnyActor in xstate are annoyingly really broad.
    */

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const currentState = actor.getSnapshot().value;

    /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
    const pathsForCurrentState = Object.values(
      // @ts-expect-error
      paths.journeys[claims.scope][currentState],
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    ).map((val) => val.path as string);
    /* eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */

    assert.ok(pathsForCurrentState[0], "pathsForCurrentState has no entries");

    assert.ok(
      reply.globals.currentUrl?.pathname,
      "reply.globals.currentUrl is not defined",
    );

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const otherJourneyPaths = Object.values(paths.journeys.others).map(
      (val) => val.path,
    ) as string[];

    if (
      !otherJourneyPaths.includes(reply.globals.currentUrl.pathname) &&
      !pathsForCurrentState.includes(reply.globals.currentUrl.pathname)
    ) {
      reply.redirect(pathsForCurrentState[0]);
      return await reply;
    }

    reply.journeyStates = {
      ...reply.journeyStates,
      [claims.scope]: actor,
    };
  } catch (error) {
    request.log.warn({ error }, "FailedToValidateJourneyUrl");
    metrics.addMetric("FailedToValidateJourneyUrl", MetricUnit.Count, 1);
    return await redirectToClientRedirectUri(
      request,
      reply,
      claims.redirect_uri,
      authorizeErrors.failedToValidateJourneyUrl,
      claims.state,
    );
  }
};
