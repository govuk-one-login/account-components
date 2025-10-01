import { removeTrailingSlash } from "../../commons/utils/fastify/removeTrailingSlash/index.js";
import { logRequest } from "../../commons/utils/fastify/logRequest/index.js";
import { logResponse } from "../../commons/utils/fastify/logResponse/index.js";
import { addDefaultCaching } from "../../commons/utils/fastify/addDefaultCaching/index.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { render } from "../../commons/utils/fastify/render/index.js";
import {
  Lang,
  setUpI18n,
} from "../../commons/utils/fastify/setUpI18n/index.js";
import fastifyFormbody from "@fastify/formbody";
import fastifyHelmet from "@fastify/helmet";
import fastifySession from "@fastify/session";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import { journeys } from "./journeys/index.js";
import en from "./translations/en.json" with { type: "json" };
import cy from "./translations/cy.json" with { type: "json" };
import { getSessionOptions } from "./utils/getSessionOptions/index.js";

export const initFrontend = async function () {
  const fastify = Fastify.default({
    trustProxy: true, // Required as HTTPS is terminated before the Lambda
    logger: true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.addHook("onRequest", logRequest);
  fastify.addHook("onRequest", removeTrailingSlash);
  fastify.addHook("onSend", (_request, reply) => addDefaultCaching(reply));
  fastify.addHook("onResponse", logResponse);

  fastify.register(fastifyCookie);
  fastify.decorateReply("render", render);
  fastify.addHook(
    "onRequest",
    setUpI18n({
      [Lang.English]: en,
      [Lang.Welsh]: cy,
    }),
  );

  fastify.setNotFoundHandler(async function (request, reply) {
    const onNotFound = (await import("./handlers/onNotFound/index.js"))
      .onNotFound;
    return onNotFound.bind(this)(request, reply);
  });

  fastify.setErrorHandler(async function (error, request, reply) {
    const onError = (await import("./handlers/onError/index.js")).onError;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return onError.bind(this)(error, request, reply);
  });

  fastify.register(
    async (fastify) => {
      (
        await import("../../commons/utils/fastify/staticFiles/index.js")
      ).staticFiles(fastify);
    },
    { prefix: "/static" },
  );

  fastify.get("/healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });

  fastify.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });

  fastify.register(fastifyFormbody);
  fastify.register(fastifyHelmet);
  fastify.register(fastifySession, getSessionOptions());
  fastify.register(fastifyCsrfProtection, {
    sessionPlugin: "@fastify/session",
  });

  fastify.register(journeys);

  return fastify;
};
