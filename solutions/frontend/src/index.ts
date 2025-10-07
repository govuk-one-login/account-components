import { removeTrailingSlash } from "../../commons/utils/fastify/removeTrailingSlash/index.js";
import { logRequest } from "../../commons/utils/fastify/logRequest/index.js";
import { logResponse } from "../../commons/utils/fastify/logResponse/index.js";
import { addDefaultCaching } from "../../commons/utils/fastify/addDefaultCaching/index.js";
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
import { journeys } from "./journeys/index.js";
import en from "./translations/en.json" with { type: "json" };
import cy from "./translations/cy.json" with { type: "json" };
import { getSessionOptions } from "../../commons/utils/fastify/getSessionOptions/index.js";
import fastifyStatic from "@fastify/static";
import * as path from "node:path";
import {
  oneDayInSeconds,
  oneYearInSeconds,
} from "../../commons/utils/contstants.js";
import staticHash from "./utils/static-hash.json" with { type: "json" };
import { csrfProtection } from "../../commons/utils/fastify/csrfProtection/index.js";

export const initFrontend = async function () {
  const fastify = Fastify.default({
    trustProxy: true, // Required as HTTPS is terminated before the Lambda
    logger: true,
    disableRequestLogging: true,
  });

  fastify.addHook("onRequest", logRequest);
  fastify.addHook("onRequest", removeTrailingSlash);
  fastify.addHook("onSend", (_request, reply) => addDefaultCaching(reply));
  fastify.addHook("onResponse", logResponse);

  fastify.register(fastifyCookie);
  fastify.decorateReply("globals", {
    getter() {
      return {
        staticHash: staticHash.hash,
      };
    },
  });
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

  fastify.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "static"),
    prefix: "/static",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader(
        "cache-control",
        `public, max-age=${oneDayInSeconds.toString()}, immutable`,
      );
    },
  });

  fastify.register(fastifyStatic, {
    root: path.join(
      import.meta.dirname,
      "/node_modules/govuk-frontend/dist/govuk/assets",
    ),
    prefix: "/assets",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader(
        "cache-control",
        `public, max-age=${oneDayInSeconds.toString()}, immutable`,
      );
    },
  });

  fastify.register(fastifyStatic, {
    root: [
      path.join(
        import.meta.dirname,
        "/node_modules/@govuk-one-login/frontend-analytics/lib",
      ),
      path.join(import.meta.dirname, "/node_modules/govuk-frontend/dist/govuk"),
    ],
    prefix: "/public/scripts",
    decorateReply: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader(
        "cache-control",
        `public, max-age=${oneDayInSeconds.toString()}, immutable`,
      );
    },
  });

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
  fastify.register(fastifyHelmet, {
    enableCSPNonces: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://*.googletagmanager.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.ruxit.com",
          "https://*.dynatrace.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.googletagmanager.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.g.doubleclick.net",
        ],
        objectSrc: ["'none'"],
        connectSrc: [
          "'self'",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.g.doubleclick.net",
          "https://*.ruxit.com",
          "https://*.dynatrace.com",
        ],
        formAction: ["'self'", "https://*.account.gov.uk"],
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
  fastify.register(fastifySession, getSessionOptions());
  fastify.register(csrfProtection);

  fastify.register(journeys);

  return fastify;
};
