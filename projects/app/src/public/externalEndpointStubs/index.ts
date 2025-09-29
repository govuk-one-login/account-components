import fastifyFormbody from "@fastify/formbody";
import type { FastifyTypeboxInstance } from "../../app.js";
import * as Type from "@fastify/type-provider-typebox";
import { getCurrentExternalEndpointStubScenario } from "./handlers/utils/config/index.js";
import { getPath } from "./handlers/utils/paths/index.js";

export const ConfigureExternalEndpointsGetSchema = {
  querystring: Type.Object({
    updated: Type.Optional(Type.Number()),
  }),
};

export const ConfigureExternalEndpointsPostSchema = {
  body: Type.Record(Type.String(), Type.String()),
};

export const externalEndpointStubs = function (app: FastifyTypeboxInstance) {
  app.register(fastifyFormbody);

  app.get(
    getPath("configure"),
    {
      schema: ConfigureExternalEndpointsGetSchema,
    },
    async function (request, reply) {
      return (await import("./handlers/configure/index.js")).getHandler(
        request,
        reply,
      );
    },
  );

  app.post(
    getPath("configure"),
    {
      schema: ConfigureExternalEndpointsPostSchema,
    },
    async function (request, reply) {
      return (await import("./handlers/configure/index.js")).postHandler(
        request,
        reply,
      );
    },
  );

  // TODO remove this once there is an actual external endpoint stub route. This is just an example
  app.get(
    "/temp-external-endpoint-stub-example",
    async function (request, reply) {
      if (
        getCurrentExternalEndpointStubScenario(
          request,
          "accountManagementApi",
          "exampleEndpoint",
        ) === "scenario2"
      ) {
        return reply.send("scenario2 invoked");
      } else if (
        getCurrentExternalEndpointStubScenario(
          request,
          "accountManagementApi",
          "exampleEndpoint",
        ) === "scenario3"
      ) {
        return reply.send("scenario3 invoked");
      }
      return reply.send("scenario1 invoked");
    },
  );
};
