import type { authorizeErrors } from "../../../utils/authorizeErrors.js";
import { buildRedirectToClientRedirectUri } from "../../../utils/buildRedirectToClientRedirectUri.js";
import type { FastifyReply } from "fastify";
import { paths } from "../../../utils/paths.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

export class ErrorResponse {
  reply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.reply = reply;
  }
}

export const getBadRequestReply = (reply: FastifyReply) => {
  reply.redirect(paths.others.authorizeError.path);
  return reply;
};

export const getRedirectToClientRedirectUriResponse = (
  reply: FastifyReply,
  redirectUri: string,
  error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
  code?: string,
) => {
  reply.redirect(
    buildRedirectToClientRedirectUri(redirectUri, error, state, code),
  );
  return reply;
};

export const addAuthorizeErrorMetric = (reason: string) => {
  metrics.addDimensions({ error_type: reason });
  metrics.addMetric("AuthorizeError", MetricUnit.Count, 1);
};
