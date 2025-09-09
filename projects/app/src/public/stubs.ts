import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import { nunjucksRender } from "../utils/nunjucksRender/index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import * as Type from "@fastify/type-provider-typebox";
import { getCurrentStubScenario } from "./handlers/stubs/utils/getStubsConfig/index.js";
import { getPath } from "./handlers/stubs/utils/paths.js";

export const StubsGetSchema = {
  querystring: Type.Object({
    updated: Type.Optional(Type.Number()),
  }),
};

export const StubsPostSchema = {
  body: Type.Record(Type.String(), Type.String()),
};

export const stubs = function (app: FastifyTypeboxInstance) {
  app.register(fastifyFormbody);
  app.register(fastifyCookie);
  app.register(nunjucksRender);

  app.get(
    getPath("root"),
    {
      schema: StubsGetSchema,
    },
    async function (request, reply) {
      return (await import("./handlers/stubs/index.js")).getHandler(
        request,
        reply,
      );
    },
  );

  app.post(
    getPath("root"),
    {
      schema: StubsPostSchema,
    },
    async function (request, reply) {
      return (await import("./handlers/stubs/index.js")).postHandler(
        request,
        reply,
      );
    },
  );

  // TODO remove this once there is an actual stub route. This is just an example
  app.get("/temp-stub-example", async function (request, reply) {
    if (
      getCurrentStubScenario(
        request,
        "accountManagementApi",
        "exampleEndpoint",
      ) === "scenario2"
    ) {
      return reply.send("scenario2 invoked");
    } else if (
      getCurrentStubScenario(
        request,
        "accountManagementApi",
        "exampleEndpoint",
      ) === "scenario3"
    ) {
      return reply.send("scenario3 invoked");
    }
    return reply.send("scenario1 invoked");
  });
};
