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

      const token = request.headers.authorization.split(" ")[1];
      if (token) {
        const claims = decodeJwt(token);

        if (claims["authenticate_scenario"] === "incorrect_password_entered") {
          reply.status(400);
          reply.send({
            code: 1008,
            message: "Incorrect password",
          });
          return reply;
        } else if (
          claims["authenticate_scenario"] ===
          "too_many_incorrect_passwords_entered"
        ) {
          reply.status(400);
          reply.send({
            code: 1094,
            message: "Too many incorrect passwords entered",
          });
          return reply;
        } else if (
          claims["authenticate_scenario"] === "temporary_intervention"
        ) {
          reply.status(400);
          reply.send({
            code: 1083,
            message: "Account has temporary intervention",
          });
          return reply;
        } else if (
          claims["authenticate_scenario"] === "permanent_intervention"
        ) {
          reply.status(400);
          reply.send({
            code: 1084,
            message: "Account has permanent intervention",
          });
          return reply;
        }
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

      const token = request.headers.authorization.split(" ")[1];
      if (token) {
        const claims = decodeJwt(token);

        if (
          claims["sendOtpChallenge_scenario"] === "too_many_codes_requested"
        ) {
          reply.status(400);
          reply.send({
            code: 1092,
            message: "Too many email codes requested",
          });
          return reply;
        } else if (
          claims["sendOtpChallenge_scenario"] === "too_many_codes_entered"
        ) {
          reply.status(400);
          reply.send({
            code: 1093,
            message: "Too many email codes entered",
          });
          return reply;
        }
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
        } else if (
          claims["verifyOtpChallenge_scenario"] === "too_many_codes_entered"
        ) {
          reply.status(400);
          reply.send({
            code: 1093,
            message: "Too many email codes entered",
          });
          return reply;
        }
      }

      reply.send();
      return reply;
    },
  );
};
