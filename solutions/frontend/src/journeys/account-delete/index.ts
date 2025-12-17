import type { FastifyInstance } from "fastify";
import { paths } from "../../utils/paths.js";

export const accountDelete = function (fastify: FastifyInstance) {
  fastify.get(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.introduction.path,
    async function (request, reply) {
      return (
        await import("./handlers/introduction.js")
      ).introductionGetHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.introduction.path,
    async function (request, reply) {
      return (
        await import("./handlers/introduction.js")
      ).introductionPostHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
      .resendEmailVerificationCode.path,
    async function (request, reply) {
      return (
        await import("./handlers/resendEmailVerificationCode.js")
      ).resendEmailVerificationCodeGetHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED
      .resendEmailVerificationCode.path,
    async function (request, reply) {
      return (
        await import("./handlers/resendEmailVerificationCode.js")
      ).resendEmailVerificationCodePostHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
    async function (request, reply) {
      return (
        await import("./handlers/verifyEmailAddress.js")
      ).verifyEmailAddressGetHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["account-delete"].EMAIL_NOT_VERIFIED.verifyEmailAddress.path,
    async function (request, reply) {
      return (
        await import("./handlers/verifyEmailAddress.js")
      ).verifyEmailAddressPostHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["account-delete"].NOT_AUTHENTICATED.enterPassword.path,
    async function (request, reply) {
      return (
        await import("./handlers/enterPassword.js")
      ).enterPasswordGetHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["account-delete"].NOT_AUTHENTICATED.enterPassword.path,
    async function (request, reply) {
      return (
        await import("./handlers/enterPassword.js")
      ).enterPasswordPostHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["account-delete"].AUTHENTICATED.confirm.path,
    async function (request, reply) {
      return (await import("./handlers/confirm.js")).confirmGetHandler(
        request,
        reply,
      );
    },
  );

  fastify.post(
    paths.journeys["account-delete"].AUTHENTICATED.confirm.path,
    async function (request, reply) {
      return (await import("./handlers/confirm.js")).confirmPostHandler(
        request,
        reply,
      );
    },
  );
};
