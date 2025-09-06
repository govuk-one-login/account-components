import type { FastifyPluginOptions, FastifyInstance } from "fastify";
import type { APIGatewayEvent, Context } from "aws-lambda";
import { getRequestParamsToLog } from "./utils/getRequestParamsToLog/index.js";
import { registerStubRoutes } from "./utils/registerStubRoutes/index.js";
import { registerStaticRoutes } from "./utils/registerStaticRoutes/index.js";
import { registerApiRoutes } from "./utils/registerApiRoutes/index.js";
import { registerPrivateApiRoutes } from "./utils/registerPrivateApiRoutes/index.js";
import { registerFrontendRoutes } from "./utils/registerFrontendRoutes/index.js";
import { registerMiscellaneousRoutes } from "./utils/registerMiscellaneousRoutes/index.js";

declare module "fastify" {
  interface FastifyRequest {
    awsLambda?: {
      event: APIGatewayEvent;
      context: Context;
    };
  }
  interface FastifyReply {
    render?: (
      templatePath: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: Record<string, any>,
    ) => Promise<void>;
  }
}

declare module "fastify" {
  interface Session {
    example?: string;
  }
}

const initApp = async function (
  fastify?: FastifyInstance,
  // @ts-expect-error  - it is necessary to include this argument even though it isn't used as otherwise the command to generate OpenAPI documents errors saying that the function should have two arguments
  opts?: FastifyPluginOptions, // eslint-disable-line
) {
  const isGeneratingOpenApiDocs = !!fastify;
  const app =
    fastify ??
    (await import("fastify")).default({
      trustProxy: true, // Required as HTTPS is terminated at API Gateway
      logger: true,
      disableRequestLogging: true,
    });

  if (isGeneratingOpenApiDocs) {
    app.register((await import("@fastify/swagger")).default, {
      openapi: {},
    });
  }

  if (registerStubRoutes()) {
    app.register((await import("./stubs.js")).stubs, { prefix: "/stub" });
  }
  if (registerStaticRoutes()) {
    app.register((await import("./staticFiles.js")).staticFiles, {
      prefix: "/static",
    });
  }
  if (registerApiRoutes()) {
    app.register((await import("./api.js")).api, { prefix: "/api" });
  }
  if (registerPrivateApiRoutes()) {
    app.register((await import("./privateApi.js")).privateApi, {
      prefix: "/private-api",
    });
  }
  if (registerFrontendRoutes()) {
    app.register((await import("./frontend.js")).frontend);
  }
  if (registerMiscellaneousRoutes()) {
    app.register((await import("./miscellaneous.js")).miscellaneous);
  }

  app.addHook("onRequest", (request, _reply, done) => {
    request.log.info(
      {
        request: getRequestParamsToLog(request),
      },
      "received request",
    );
    done();
  });

  app.addHook("onRequest", async (request, reply) => {
    const url = new URL(request.url, "https://fake.com");
    if (url.pathname.endsWith("/")) {
      return reply.redirect(`${url.pathname.slice(0, -1)}${url.search}`, 308);
    }
    return;
  });

  app.addHook("onSend", async (_request, reply) => {
    if (typeof reply.getHeader("cache-control") === "undefined") {
      reply.header("cache-control", "no-cache");
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        request: getRequestParamsToLog(request),
        response: {
          statusCode: reply.statusCode,
        },
      },
      "sent response",
    );
  });

  return app;
};

// eslint-disable-next-line
export default initApp;
