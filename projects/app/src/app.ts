import type { FastifyPluginOptions, FastifyInstance } from "fastify";
import { frontend } from "./frontend.js";
import { api } from "./api.js";
import { staticFiles } from "./staticFiles.js";
import type { APIGatewayEvent, Context } from "aws-lambda";
import { getRequestParamsToLog } from "./utils/getRequestParamsToLog/index.js";
import { miscellaneous } from "./miscellaneous.js";

declare module "fastify" {
  interface FastifyRequest {
    awsLambda: {
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

  app.register(staticFiles);
  app.register(api);
  app.register(frontend);
  app.register(miscellaneous);

  app.addHook("onSend", async (_request, reply) => {
    if (typeof reply.getHeader("cache-control") === "undefined") {
      reply.header("cache-control", "no-cache");
    }
  });

  app.addHook("onRequest", (request, _reply, done) => {
    request.log.info(
      {
        request: getRequestParamsToLog(request),
      },
      "received request",
    );
    done();
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
