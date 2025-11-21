import type { FastifyReply, FastifyRequest } from "fastify";
import { destroySession } from "./session.js";
import { destroyApiSession } from "./apiSession.js";
import { paths } from "./paths.js";

export const redirectToAuthorizeErrorPage = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  await destroyApiSession(request, reply);
  await destroySession(request);

  reply.redirect(paths.others.authorizeError.path);

  return reply;
};
