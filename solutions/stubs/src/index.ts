import { removeTrailingSlash } from "../../commons/utils/fastify/removeTrailingSlash/index.js";
import { logRequest } from "../../commons/utils/fastify/logRequest/index.js";
import { logResponse } from "../../commons/utils/fastify/logResponse/index.js";
import { addDefaultCaching } from "../../commons/utils/fastify/addDefaultCaching/index.js";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { render } from "../../commons/utils/fastify/render/index.js";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import * as path from "node:path";
import fastifyHelmet from "@fastify/helmet";
import { oneYearInSeconds } from "../../commons/utils/constants.js";
import staticHash from "./utils/static-hash.json" with { type: "json" };
import { generateRequestObject } from "./generateRequestObject/index.js";
import { addStaticAssetsCachingHeaders } from "../../commons/utils/fastify/addStaticAssetsCachingHeaders/index.js";
import { clientJwks } from "./clientJwks/index.js";
import { clientCallback } from "./clientCallback/index.js";
import { flushMetrics } from "../../commons/utils/fastify/flushMetrics/index.js";

export const initStubs = async function () {
  const fastify = Fastify.default({
    trustProxy: true, // Required as HTTPS is terminated before the Lambda
    logger: true,
    disableRequestLogging: true,
  });

  fastify.addHook("onRequest", logRequest);
  fastify.addHook("onRequest", removeTrailingSlash);
  fastify.addHook("onSend", (_request, reply) => addDefaultCaching(reply));
  fastify.addHook("onSend", () => flushMetrics());
  fastify.addHook("onResponse", logResponse);

  fastify.register(fastifyCookie);
  fastify.register(fastifyFormbody);
  fastify.register(fastifyHelmet, {
    enableCSPNonces: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
      },
    },
    dnsPrefetchControl: {
      allow: false,
    },
    frameguard: {
      action: "deny",
    },
    hsts: {
      maxAge: oneYearInSeconds,
      preload: true,
      includeSubDomains: true,
    },
    referrerPolicy: false,
    permittedCrossDomainPolicies: false,
  });

  fastify.decorateReply("globals", {
    getter() {
      return {
        staticHash: staticHash.hash,
      };
    },
  });
  fastify.decorateReply("render", render);

  fastify.setNotFoundHandler(async function (request, reply) {
    const onNotFound = (
      await import("../../commons/utils/fastify/onNotFoundHandler/index.js")
    ).onNotFound;
    return onNotFound.bind(this)(request, reply);
  });

  fastify.setErrorHandler(async function (error, request, reply) {
    const onError = (
      await import("../../commons/utils/fastify/onErrorHandler/index.js")
    ).onError;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return onError.bind(this)(error, request, reply);
  });

  fastify.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/static",
    decorateReply: false,
    cacheControl: false,
    setHeaders: addStaticAssetsCachingHeaders,
  });

  fastify.get("/healthcheck", async function (_request, reply) {
    await reply.send("ok");
    return reply;
  });

  fastify.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });

  fastify.register(generateRequestObject);
  fastify.register(clientJwks);
  fastify.register(clientCallback);

  return fastify;
};
