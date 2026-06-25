import { decodeJwt } from "jose";
import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const accountInterventionsServiceApi = function (app: FastifyInstance) {
  app.get(
    paths.accountInterventionsServiceApi.getUserAisStatus,
    async function (request, reply) {
      const token = request.headers.authorization?.split(" ")[1];
      if (token) {
        const claims = decodeJwt(token);

        if (claims["getUserAisStatus_scenario"] === "blocked") {
          reply.send({
            state: {
              blocked: true,
              suspended: false,
              reproveIdentity: false,
              resetPassword: false,
            },
          });
          return reply;
        } else if (
          claims["getUserAisStatus_scenario"] ===
          "suspended_no_actions_required"
        ) {
          reply.send({
            state: {
              blocked: false,
              suspended: true,
              reproveIdentity: false,
              resetPassword: false,
            },
          });
          return reply;
        } else if (
          claims["getUserAisStatus_scenario"] ===
          "suspended_reset_password_required"
        ) {
          reply.send({
            state: {
              blocked: false,
              suspended: true,
              reproveIdentity: false,
              resetPassword: true,
            },
          });
          return reply;
        } else if (
          claims["getUserAisStatus_scenario"] ===
          "suspended_reprove_identity_required"
        ) {
          reply.send({
            state: {
              blocked: false,
              suspended: true,
              reproveIdentity: true,
              resetPassword: false,
            },
          });
          return reply;
        } else if (
          claims["getUserAisStatus_scenario"] ===
          "suspended_reset_password_and_reprove_identity_required"
        ) {
          reply.send({
            state: {
              blocked: false,
              suspended: true,
              reproveIdentity: true,
              resetPassword: true,
            },
          });
          return reply;
        }
      }

      reply.send({
        state: {
          blocked: false,
          suspended: false,
          reproveIdentity: false,
          resetPassword: false,
        },
      });
      return reply;
    },
  );
};
