import type { FastifyInstance } from "fastify";
import { paths } from "../../utils/paths.js";
import { PasskeyCreateState } from "../utils/stateMachines/passkey-create.js";

export const passkeyCreate = function (fastify: FastifyInstance) {
  fastify.get(
    paths.journeys["passkey-create"][PasskeyCreateState.passwordNotProvided]
      .introduction.path,
    async function (request, reply) {
      return (
        await import("./handlers/introduction.js")
      ).introductionGetHandler(request, reply);
    },
  );
};
