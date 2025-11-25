import type { FastifyReply, FastifyRequest } from "fastify";
import type { authorizeErrors } from "../../../commons/utils/authorize/authorizeErrors.js";
import { getRedirectToClientRedirectUri } from "../../../commons/utils/authorize/getRedirectToClientRedirectUri.js";
import { destroySession } from "./session.js";
import { destroyApiSession } from "./apiSession.js";

export const redirectToClientRedirectUri = async (
  request: FastifyRequest,
  reply: FastifyReply,
  redirectUri: string,
  error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
  code?: string,
) => {
  await destroyApiSession(request, reply);
  await destroySession(request);

  reply.redirect(
    getRedirectToClientRedirectUri(redirectUri, error, state, code),
  );

  return reply;
};
