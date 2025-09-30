import type { FastifyRequest } from "fastify";
import { getRequestParamsToLog } from "../../getRequestParamsToLog/index.js";

export const logRequest = async (request: FastifyRequest) => {
  request.log.info(
    {
      request: getRequestParamsToLog(request),
    },
    "received request",
  );
};
