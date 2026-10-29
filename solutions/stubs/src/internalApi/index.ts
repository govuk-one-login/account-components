import { decodeJwt } from "jose";
import { paths } from "../utils/paths.js";
import type { FastifyInstance } from "fastify";
import * as v from "valibot";
import { LockoutType, Source } from "../../../commons/utils/constants.js";
import { randomUUID } from "node:crypto";

export const internalApi = function (app: FastifyInstance) {
  app.post(paths.internalApi.generateOTP, async function (request, reply) {
    const token = request.headers.authorization?.split(" ")[1];
    if (token) {
      const claims = decodeJwt(token);

      if (claims["generateOTP_scenario"] === "too_many_otps_requested") {
        reply.status(403);
        reply.send({
          code: 1002,
          message: "TooManyOTPsRequested",
        });
        return reply;
      } else if (
        claims["generateOTP_scenario"] === "too_many_incorrect_otps_entered"
      ) {
        reply.status(403);
        reply.send({
          code: 1003,
          message: "TooManyIncorrectOTPsEntered",
        });
        return reply;
      }
    }

    const body = v.parse(
      v.object({
        expiresIn: v.number(),
      }),
      request.body,
    );

    reply.send({
      otp: "192837",
      expires: Math.floor(Date.now() / 1000) + body.expiresIn,
    });
    return reply;
  });

  app.post(paths.internalApi.checkOTP, async function (request, reply) {
    const token = request.headers.authorization?.split(" ")[1];
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
        reply.status(403);
        reply.send({
          code: 1003,
          message: "InvalidOTP",
        });
        return reply;
      }
    }

    reply.status(204);
    reply.send();
    return reply;
  });

  app.post(paths.internalApi.checkPassword, async function (request, reply) {
    const token = request.headers.authorization?.split(" ")[1];
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
      } else if (
        claims["checkPassword_scenario"] === "incorrect_password" // pragma: allowlist secret
      ) {
        reply.status(403);
        reply.send({
          code: 1003,
          message: "InvalidPassword",
        });
        return reply;
      }
    }

    reply.status(204);
    reply.send();
    return reply;
  });

  app.get(paths.internalApi.lockouts, async function (request, reply) {
    const token = request.headers.authorization?.split(" ")[1];
    if (token) {
      const claims = decodeJwt(token);

      const pathParams = v.parse(
        v.object({
          publicSubjectId: v.string(),
        }),
        request.params,
      );

      const queryParams = v.parse(
        v.object({
          source: v.enum(Source),
          type: v.optional(v.enum(LockoutType)),
        }),
        request.query,
      );

      const lockoutBase = {
        lockedOutUntil: Math.floor(Date.now() / 1000) + 60 * 15,
        lockedOutAt: Math.floor(Date.now() / 1000) - 60 * 15,
        id: randomUUID(),
        publicSubjectId: pathParams.publicSubjectId,
        source: queryParams.source,
      };

      if (
        claims["lockouts_scenario"] === "locked_out_too_many_otps_requested"
      ) {
        reply.send([
          {
            ...lockoutBase,
            type: "TooManyOTPsRequested",
          },
        ]);
        return reply;
      } else if (
        claims["lockouts_scenario"] ===
        "locked_out_too_many_incorrect_otps_entered"
      ) {
        reply.send([
          {
            ...lockoutBase,
            type: "TooManyIncorrectOTPsEntered",
          },
        ]);
        return reply;
      } else if (
        claims["lockouts_scenario"] ===
        "locked_out_too_many_incorrect_passwords_entered"
      ) {
        reply.send([
          {
            ...lockoutBase,
            type: "TooManyIncorrectPasswordsEntered",
          },
        ]);
        return reply;
      }
    }

    reply.send([]);
    return reply;
  });
};
