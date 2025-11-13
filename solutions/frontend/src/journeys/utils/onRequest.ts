import type { FastifyReply, FastifyRequest } from "fastify";
import { paths } from "../../utils/paths.js";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import * as v from "valibot";
import { journeys } from "./constants.js";
import { getClaimsSchema } from "../../../../commons/utils/authorize/getClaimsSchema.js";

const redirectToErrorPage = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  await request.session.destroy();
  reply.redirect(paths.authorizeError);
  return reply;
};

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

  if (!journeys[claimsResult.output.scope]) {
    request.log.warn("NoJourneyForScope");
    metrics.addMetric("NoJourneyForScope", MetricUnit.Count, 1);
    // TODO
  }

  return reply;
};
