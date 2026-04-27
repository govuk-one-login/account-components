import type { FastifyInstance } from "fastify";
import { paths } from "../utils/paths.js";

export const notify = function (fastify: FastifyInstance) {
  fastify.post(paths.notify.sendEmail, async function (request, reply) {
    return (await import("./handlers/sendEmail.js")).sendEmailPostHandler(
      request,
      reply,
    );
  });
};
