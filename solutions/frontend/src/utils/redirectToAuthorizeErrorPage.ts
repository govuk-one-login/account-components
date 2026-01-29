import type { FastifyReply, FastifyRequest } from "fastify";
import { destroySession } from "./session.js";
import { paths } from "./paths.js";

export const redirectToAuthorizeErrorPage = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  await destroySession(request);

  reply.redirect(paths.others.authorizeError.path);

  return reply;
};
