import { decodeJwt } from "jose";
import { paths } from "../utils/paths.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import * as v from "valibot";
import { LockoutType, Source } from "../../../commons/utils/constants.js";
import { randomUUID } from "node:crypto";

const getToken = (request: FastifyRequest) =>
  request.headers.authorization?.split(" ")[1];

export const internalApi = function (app: FastifyInstance) {
  app.post(paths.internalApi.generateOTP, async function (request, reply) {
    const token = getToken(request);
    if (token) {
      const claims = decodeJwt(token);

      if (claims["generateOTP_scenario"] === "too_many_otps_requested") {
        reply.status(403);
        reply.send({
          code: 1002,
          message: "TooManyOTPsRequested",
        });
        return reply;
      }
    }

    const body = v.safeParse(
      v.object({
        expiresIn: v.optional(v.number()),
      }),
      request.body,
    );

    if (!body.success) {
      reply.status(400);
      reply.send({
        code: 1001,
        message: "InvalidRequest",
      });
      return reply;
    }

    reply.send({
      otp: "192837",
      expiresAt: Math.floor(Date.now() / 1000) + (body.output.expiresIn ?? 900),
    });
    return reply;
  });

  app.post(paths.internalApi.checkOTP, async function (request, reply) {
    const token = getToken(request);
    if (token) {
      const claims = decodeJwt(token);

      if (claims["checkOTP_scenario"] === "too_many_incorrect_otps_entered") {
        reply.status(403);
        reply.send({
          code: 1002,
          message: "TooManyIncorrectOTPsEntered",
        });
        return reply;
      } else if (claims["checkOTP_scenario"] === "incorrect_otp") {
        reply.send({
          valid: false,
        });
        return reply;
      }
    }

    reply.send({
      valid: true,
    });
    return reply;
  });

  app.post(paths.internalApi.checkPassword, async function (request, reply) {
    const token = getToken(request);
    if (token) {
      const claims = decodeJwt(token);

      if (
        claims["checkPassword_scenario"] ===
        "too_many_incorrect_passwords_entered"
      ) {
        reply.status(403);
        reply.send({
          code: 1002,
          message: "TooManyIncorrectPasswordsEntered",
        });
        return reply;
      } else if (claims["checkPassword_scenario"] === "incorrect_password") {
        reply.send({
          valid: false,
        });
        return reply;
      }
    }

    reply.send({
      valid: true,
    });
    return reply;
  });

  app.get(paths.internalApi.lockouts, async function (request, reply) {
    const token = getToken(request);
    if (token) {
      const claims = decodeJwt(token);

      const lockoutScenarios: Record<string, LockoutType> = {
        locked_out_too_many_otps_requested: LockoutType.TooManyOTPsRequested,
        locked_out_too_many_incorrect_otps_entered:
          LockoutType.TooManyIncorrectOTPsEntered,
        locked_out_too_many_incorrect_passwords_entered:
          LockoutType.TooManyIncorrectPasswordsEntered, // pragma: allowlist secret
      };

      if (
        typeof claims["lockouts_scenario"] === "string" &&
        lockoutScenarios[claims["lockouts_scenario"]] !== undefined
      ) {
        const queryParams = v.safeParse(
          v.object({
            source: v.enum(Source),
          }),
          request.query,
        );

        if (!queryParams.success) {
          reply.status(400);
          reply.send({
            code: 1001,
            message: "InvalidRequest",
          });
          return reply;
        }

        reply.send([
          {
            id: randomUUID(),
            source: queryParams.output.source,
            type: lockoutScenarios[claims["lockouts_scenario"]],
            lockedOutAt: Math.floor(Date.now() / 1000) - 60 * 15,
            lockedOutUntil: Math.floor(Date.now() / 1000) + 60 * 15,
          },
        ]);
        return reply;
      }
    }

    reply.send([]);
    return reply;
  });
};
