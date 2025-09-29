import type { FastifyRequest, FastifyReply } from "fastify";
import { getRequestParamsToLog } from "../../utils/getRequestParamsToLog/index.js";

export const logResponse = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  request.log.info(
    {
      request: getRequestParamsToLog(request),
      response: {
        statusCode: reply.statusCode,
      },
    },
    "sent response",
  );
};
