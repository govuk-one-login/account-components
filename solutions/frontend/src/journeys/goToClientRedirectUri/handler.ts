import { paths } from "../../utils/paths.js";
import assert from "node:assert";
import * as v from "valibot";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../utils/redirectToClientRedirectUri.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export const goToClientRedirectUriHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    assert.ok(request.session.claims, "Claims are not defined in session");

    const params = v.parse(
      v.object({
        error: v.optional(v.string()),
        error_description: v.optional(v.string()),
        code: v.optional(v.string()),
        state: v.optional(v.string()),
      }),
      // TODO is uppercase get correct?
      request.method === "GET" ? request.query : request.body,
    );

    const authorizeError = Object.values(authorizeErrors).find(
      (err) =>
        err.description === params.error_description &&
        err.type === params.error,
    );

    assert.ok(
      params.code ?? authorizeError,
      "Valid error params or a code must be provided",
    );

    return await redirectToClientRedirectUri(
      request,
      reply,
      request.session.claims.redirect_uri,
      authorizeError,
      request.session.claims.state,
      params.code,
    );
  } catch (error) {
    request.log.error(error);
    await reply.redirect(paths.others.authorizeError.path);
    return reply;
  }
};
