import { paths } from "../../utils/paths.js";
import assert from "node:assert";
import * as v from "valibot";
import { authorizeErrors } from "../../../../commons/utils/authorize/authorizeErrors.js";
import { redirectToClientRedirectUri } from "../../utils/redirectToClientRedirectUri.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export const goToClientRedirectUriGet = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    assert.ok(request.session.claims, "Claims are not defined in session");

    const queryParams = v.parse(
      v.object({
        error: v.optional(v.string()),
        error_description: v.optional(v.string()),
        code: v.optional(v.string()),
        state: v.optional(v.string()),
      }),
      request.query,
    );

    const authorizeError = Object.values(authorizeErrors).find(
      (err) =>
        err.description === queryParams.error_description &&
        err.type === queryParams.error,
    );

    assert.ok(
      queryParams.code ?? authorizeError,
      "Valid error params or a code must be provided",
    );

    return await redirectToClientRedirectUri(
      request,
      reply,
      request.session.claims.redirect_uri,
      authorizeError,
      request.session.claims.state,
      queryParams.code,
    );
  } catch (error) {
    request.log.error(error);
    await reply.redirect(paths.others.authorizeError.path);
    return reply;
  }
};
