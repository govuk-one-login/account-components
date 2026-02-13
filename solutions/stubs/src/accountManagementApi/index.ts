import { decodeJwt } from "jose";
import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const accountManagementApi = function (app: FastifyInstance) {
  app.post(
    paths.accountManagementApi.authenticate,
    async function (request, reply) {
      if (!request.headers.authorization) {
        reply.status(401);
        reply.send();
        return reply;
      }

      reply.send();
      return reply;
    },
  );

  app.post(
    paths.accountManagementApi.deleteAccount,
    async function (request, reply) {
      if (!request.headers.authorization) {
        reply.status(401);
        reply.send();
        return reply;
      }

      reply.send();
      return reply;
    },
  );

  app.post(
    paths.accountManagementApi.sendOtpChallenge,
    async function (request, reply) {
      if (!request.headers.authorization) {
        reply.status(401);
        reply.send();
        return reply;
      }

      reply.send();
      return reply;
    },
  );

  app.post(
    paths.accountManagementApi.verifyOtpChallenge,
    async function (request, reply) {
      if (!request.headers.authorization) {
        reply.status(401);
        reply.send();
        return reply;
      }

      const token = request.headers.authorization.split(" ")[1];
      if (token) {
        const claims = decodeJwt(token);

        if (claims["verifyOtpChallenge_scenario"] === "invalid_otp_code") {
          reply.status(400);
          reply.send({
            code: 1020,
            message: "Invalid OTP code",
          });
          return reply;
        }
      }

      reply.send();
      return reply;
    },
  );
};
