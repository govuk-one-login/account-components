import type { FastifyRequest } from "fastify";
import { getDiSessionIdsFromRequest } from "../getDiSessionIdsFromRequest/index.js";

export const getRequestParamsToLog = (req?: FastifyRequest) => {
  return {
    awsRequestId: req?.awsLambda?.context.awsRequestId ?? "",
    method: req?.method ?? "",
    url: req?.url ?? "",
    referrer: req?.headers.referer ?? "",
    diSessionIds: getDiSessionIdsFromRequest(req),
  };
};
