import type { FastifyInstance } from "fastify";
import { paths } from "../../utils/paths.js";

export const testingJourney = function (fastify: FastifyInstance) {
  fastify.get(
    paths.journeys["testing-journey"].PASSWORD_NOT_PROVIDED.step1.path,
    async function (request, reply) {
      return (await import("./handlers.js")).step1GetHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["testing-journey"].PASSWORD_NOT_PROVIDED.step1.path,
    async function (request, reply) {
      return (await import("./handlers.js")).step1PostHandler(request, reply);
    },
  );

  fastify.get(
    paths.journeys["testing-journey"].PASSWORD_NOT_PROVIDED.enterPassword.path,
    async function (request, reply) {
      return (await import("./handlers.js")).enterPasswordGetHandler(
        request,
        reply,
      );
    },
  );

  fastify.post(
    paths.journeys["testing-journey"].PASSWORD_NOT_PROVIDED.enterPassword.path,
    async function (request, reply) {
      return (await import("./handlers.js")).enterPasswordPostHandler(
        request,
        reply,
      );
    },
  );

  fastify.get(
    paths.journeys["testing-journey"].PASSWORD_PROVIDED.confirm.path,
    async function (request, reply) {
      return (await import("./handlers.js")).confirmGetHandler(request, reply);
    },
  );

  fastify.post(
    paths.journeys["testing-journey"].PASSWORD_PROVIDED.confirm.path,
    async function (request, reply) {
      return (await import("./handlers.js")).confirmPostHandler(request, reply);
    },
  );
};
