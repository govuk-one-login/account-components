import type { FastifyInstance } from "fastify";
import { paths } from "../../utils/paths.js";

export const passkeyCreate = function (fastify: FastifyInstance) {
  fastify.get(
    paths.journeys["passkey-create"].NOT_CREATED.setUpPasskey.path,
    async function (request, reply) {
      return (await import("./handlers/create.js")).getHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["passkey-create"].NOT_CREATED.cannotSetUpPasskey.path,
    async function (request, reply) {
      return (await import("./handlers/create.js")).getHandler(
        request,
        reply,
        true,
      );
    },
  );

  fastify.post(
    paths.journeys["passkey-create"].NOT_CREATED.cannotSetUpPasskey.path,
    async function (request, reply) {
      return (await import("./handlers/create.js")).postHandler(request, reply);
    },
  );
};
