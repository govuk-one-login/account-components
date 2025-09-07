import type { FastifyRequest, FastifyReply } from "fastify";

export const removeTrailingSlash = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const url = new URL(request.url, "https://fake.com");
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    reply.redirect(`${url.pathname.slice(0, -1)}${url.search}`, 308);
  }
};
