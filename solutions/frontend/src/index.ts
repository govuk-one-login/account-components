import { removeTrailingSlash } from "../../commons/utils/fastify/removeTrailingSlash/index.js";
import { addDefaultCaching } from "../../commons/utils/fastify/addDefaultCaching/index.js";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { render } from "../../commons/utils/fastify/render/index.js";
import fastifyFormbody from "@fastify/formbody";
import fastifyHelmet from "@fastify/helmet";
import fastifySession from "@fastify/session";
import { journeyRoutes } from "./journeys/index.js";
import en from "./translations/en.json" with { type: "json" };
import cy from "./translations/cy.json" with { type: "json" };
import { getSessionOptions } from "./utils/session.js";
import fastifyStatic from "@fastify/static";
import * as path from "node:path";
import { oneYearInSeconds } from "../../commons/utils/constants.js";
import staticHash from "./utils/static-hash.json" with { type: "json" };
import { csrfProtection } from "../../commons/utils/fastify/csrfProtection/index.js";
import { addStaticAssetsCachingHeaders } from "../../commons/utils/fastify/addStaticAssetsCachingHeaders/index.js";
import i18next from "i18next";
import {
  plugin as i18nextMiddlewarePlugin,
  handle as i18nextMiddlewareHandle,
} from "i18next-http-middleware";
import { getCurrentUrl } from "../../commons/utils/fastify/getCurrentUrl/index.js";
import {
  configureI18n,
  Lang,
} from "../../commons/utils/configureI18n/index.js";
import {
  frontendUiTranslationCy,
  frontendUiTranslationEn,
} from "@govuk-one-login/frontend-ui";
import { paths } from "./utils/paths.js";
import { getEnvironment } from "../../commons/utils/getEnvironment/index.js";
import { FastifyPowertoolsLogger } from "../../commons/utils/fastify/powertoolsLogger/index.js";

await configureI18n({
  [Lang.English]: {
    ...en,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    FECTranslations: frontendUiTranslationEn,
  },
  [Lang.Welsh]: {
    ...cy,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    FECTranslations: frontendUiTranslationCy,
  },
});

export const initFrontend = async function () {
  const fastify = Fastify.default({
    trustProxy: true, // Required as HTTPS is terminated before the Lambda
    loggerInstance: new FastifyPowertoolsLogger(),
    disableRequestLogging: true,
  });

  fastify.addHook("onRequest", removeTrailingSlash);
  fastify.addHook("onSend", (_request, reply) => addDefaultCaching(reply));

  fastify.register(fastifyCookie);
  fastify.register(i18nextMiddlewarePlugin, { i18next });
  // @ts-expect-error
  fastify.addHook("onRequest", i18nextMiddlewareHandle(i18next));

  fastify.addHook("onRequest", async (request, reply) => {
    reply.globals = {
      ...reply.globals,
      staticHash: staticHash.hash,
      currentUrl: getCurrentUrl(request),
      htmlLang: request.i18n.language,
      authFrontEndUrl: process.env["AUTH_FRONTEND_URL"],
      analyticsCookieDomain: process.env["ANALYTICS_COOKIE_DOMAIN"],
    };
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

  fastify.register(fastifyStatic, {
    root: path.join(
      import.meta.dirname,
      "/node_modules/govuk-frontend/dist/govuk/assets",
    ),
    prefix: "/assets",
    decorateReply: false,
    cacheControl: false,
    setHeaders: addStaticAssetsCachingHeaders,
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

  fastify.get(
    paths.others.authorizeError.path,
    async function (request, reply) {
      return (await import("./handlers/authorizeError/index.js")).handler(
        request,
        reply,
      );
    },
  );

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
        formAction:
          getEnvironment() === "local"
            ? ["'self'", "http://localhost:*"]
            : ["'self'", "https://*.account.gov.uk"],
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

  fastify.register(async (fastify) => {
    fastify.register(fastifySession, await getSessionOptions());
    fastify.register(csrfProtection);

    fastify.get(
      paths.others.startSession.path,
      async function (request, reply) {
        return (await import("./handlers/startSession/index.js")).handler(
          request,
          reply,
        );
      },
    );

    fastify.register(journeyRoutes);
  });

  return fastify;
};
