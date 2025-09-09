import { frontend } from "./frontend.js";
import { staticFiles } from "./staticFiles.js";
import { resolveEnvVarToBool } from "../utils/resolveEnvVarToBool/index.js";
import type { FastifyTypeboxInstance } from "../app.js";

export const publicRoutes = async function (app: FastifyTypeboxInstance) {
  if (resolveEnvVarToBool("REGISTER_STUB_ROUTES")) {
    app.register((await import("./stubs.js")).stubs, { prefix: "/stubs" });
  }
  app.register(staticFiles, { prefix: "/static" });
  app.register(frontend);

  app.get("/healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });

  app.get("/robots.txt", async function (request, reply) {
    return (await import("./handlers/robots.txt/index.js")).handler(
      request,
      reply,
    );
  });
};
