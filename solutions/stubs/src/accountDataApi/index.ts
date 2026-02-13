import type { FastifyInstance } from "fastify";
import { paths } from "../utils/paths.js";

export const accountDataApi = function (fastify: FastifyInstance) {
  fastify.post(
    paths.accountDataApi.createPasskey,
    async function (request, reply) {
      return (await import("./handlers/passkeys.js")).passkeysPostHandler(
        request,
        reply,
      );
    },
  );
};
