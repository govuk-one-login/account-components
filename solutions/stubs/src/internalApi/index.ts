import { decodeJwt } from "jose";
import { paths } from "../utils/paths.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as v from "valibot";
import { LockoutType, Source } from "../../../commons/utils/constants.js";
import { randomUUID } from "node:crypto";

const errorScenarios: Record<string, { code: number; message: string }> = {
  too_many_otps_requested: { code: 1002, message: "TooManyOTPsRequested" },
  too_many_incorrect_otps_entered: {
    code: 1003,
    message: "TooManyIncorrectOTPsEntered",
  },
  too_many_incorrect_passwords_entered: {
    code: 1004,
    message: "TooManyIncorrectPasswordsEntered", // pragma: allowlist secret
  },
  incorrect_otp: { code: 1005, message: "InvalidOTP" },
  incorrect_password: { code: 1005, message: "InvalidPassword" }, // pragma: allowlist secret
};

const lockoutScenarios: Record<string, LockoutType> = {
  locked_out_too_many_otps_requested: LockoutType.TooManyOTPsRequested,
  locked_out_too_many_incorrect_otps_entered:
    LockoutType.TooManyIncorrectOTPsEntered,
  locked_out_too_many_incorrect_passwords_entered:
    LockoutType.TooManyIncorrectPasswordsEntered, // pragma: allowlist secret
};

const sendScenarioError = (
  claims: ReturnType<typeof decodeJwt>,
  claimKey: string,
  reply: FastifyReply,
): boolean => {
  const scenario = v.parse(v.optional(v.string()), claims[claimKey]);
  const error = scenario !== undefined ? errorScenarios[scenario] : undefined;
  if (error === undefined) return false;
  reply.status(403);
  reply.send(error);
  return true;
};

const getToken = (request: FastifyRequest) =>
  request.headers.authorization?.split(" ")[1];

export const internalApi = function (app: FastifyInstance) {
  app.post(paths.internalApi.generateOTP, async function (request, reply) {
    const token = getToken(request);
    if (
      token &&
      sendScenarioError(decodeJwt(token), "generateOTP_scenario", reply)
    ) {
      return reply;
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
    const token = getToken(request);
    if (
      token &&
      sendScenarioError(decodeJwt(token), "checkOTP_scenario", reply)
    ) {
      return reply;
    }

    reply.status(204);
    reply.send();
    return reply;
  });

  app.post(paths.internalApi.checkPassword, async function (request, reply) {
    const token = getToken(request);
    if (
      token &&
      sendScenarioError(decodeJwt(token), "checkPassword_scenario", reply)
    ) {
      return reply;
    }

    reply.status(204);
    reply.send();
    return reply;
  });

  app.get(paths.internalApi.lockouts, async function (request, reply) {
    const token = getToken(request);
    if (token) {
      const claims = decodeJwt(token);
      const scenario = v.parse(
        v.optional(v.string()),
        claims["lockouts_scenario"],
      );
      const lockoutType =
        scenario !== undefined ? lockoutScenarios[scenario] : undefined;

      if (lockoutType !== undefined) {
        const pathParams = v.parse(
          v.object({ publicSubjectId: v.string() }),
          request.params,
        );

        const queryParams = v.parse(
          v.object({
            source: v.enum(Source),
            type: v.optional(v.enum(LockoutType)),
          }),
          request.query,
        );

        reply.send([
          {
            id: randomUUID(),
            publicSubjectId: pathParams.publicSubjectId,
            source: queryParams.source,
            type: lockoutType,
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
