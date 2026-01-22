import { decodeJwt } from "jose";
import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";

export const generateRequestObject = function (app: FastifyInstance) {
  app.post(paths.requestObjectGenerator, async function (request, reply) {
    return (await import("./handlers/post.js")).generateRequestObjectPost(
      request,
      reply,
    );
  });
  app.get(paths.requestObjectCreator, async function (request, reply) {
    return (await import("./handlers/create.js")).createRequestObjectGet(
      request,
      reply,
    );
  });
  app.post(paths.requestObjectCreator, async function (request, reply) {
    const handler = (
      await import("./handlers/create.js")
    ).createRequestObjectPost(app);
    return handler(request, reply);
  });

  app.post(paths.accountManagementApi.authenticate, async function (_, reply) {
    reply.send();
    return reply;
  });

  app.post(paths.accountManagementApi.deleteAccount, async function (_, reply) {
    reply.send();
    return reply;
  });

  app.post(
    paths.accountManagementApi.sendOtpChallenge,
    async function (_, reply) {
      reply.send();
      return reply;
    },
  );

  app.post(
    paths.accountManagementApi.verifyOtpChallenge,
    async function (request, reply) {
      if (request.headers.authorization) {
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
      }

      reply.send();
      return reply;
    },
  );
};
