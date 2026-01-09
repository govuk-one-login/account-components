import type { FastifyInstance } from "fastify";
import { paths } from "../../utils/paths.js";

export const passkeyCreate = function (fastify: FastifyInstance) {
  fastify.get(
    paths.journeys["passkey-create"].NOT_CREATED.create.path,
    async function (request, reply) {
      return (await import("./handlers/create.js")).getHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["passkey-create"].NOT_CREATED.create.path,
    async function (request, reply) {
      return (await import("./handlers/create.js")).postHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["passkey-create"].CREATED.success.path,
    async function (request, reply) {
      return (await import("./handlers/success.js")).getHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["passkey-create"].CREATED.success.path,
    async function (request, reply) {
      return (await import("./handlers/success.js")).postHandler(
        request,
        reply,
      );
    },
  );
};
