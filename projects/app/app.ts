import type { FastifyPluginOptions, FastifyInstance } from "fastify";
import { frontend } from "./frontend.js";
import { api } from "./api.js";
import { staticFiles } from "./staticFiles.js";
import { defaultCaching } from "./defaultCaching.js";
declare module "fastify" {
  interface FastifyReply {
    render?: (
      templatePath: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variables: Record<string, any>,
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
  const app = fastify ?? (await import("fastify")).default();

  if (isGeneratingOpenApiDocs) {
    app.register((await import("@fastify/swagger")).default, {
      openapi: {},
    });
  }

  app.register(defaultCaching);
  app.register(staticFiles);
  app.register(api);
  app.register(frontend);

  return app;
};

// eslint-disable-next-line
export default initApp;
