import fp from "fastify-plugin";
import * as v from "valibot";
import fastifyCsrfProtection from "@fastify/csrf-protection";

export const csrfProtection = fp(async function (fastify) {
  await fastify.register(fastifyCsrfProtection, {
    sessionPlugin: "@fastify/session",
    getToken: (request) => {
      const body = v.safeParse(
        v.object({ _csrf: v.optional(v.string()) }),
        request.body,
      );
      return body.success ? body.output._csrf : undefined;
    },
  });
  fastify.addHook("preHandler", (request, reply, done) => {
    reply.globals.csrfToken = reply.generateCsrf();

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      fastify.csrfProtection(request, reply, done);
    } else {
      done();
    }
  });
});
