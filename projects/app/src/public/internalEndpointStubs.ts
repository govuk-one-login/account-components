import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import { nunjucksRender } from "../utils/nunjucksRender/index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import * as Type from "@fastify/type-provider-typebox";
import { getCurrentInternalEndpointStubScenario } from "./handlers/internalEndpointStubs/utils/config/index.js";
import { getPath } from "./handlers/internalEndpointStubs/utils/paths/index.js";
import { generateAccessToken } from "../stubs/tokenGenerator/index.js";
import logger from "../stubs/utils/logger.js";
import { buildJWK } from "../stubs/jwks/index.js";
import type { RequestBody } from "../stubs/types/token.js";
export const ConfigureInternalEndpointsGetSchema = {
  querystring: Type.Object({
    updated: Type.Optional(Type.Number()),
  }),
};

export const ConfigureInternalEndpointsPostSchema = {
  body: Type.Record(Type.String(), Type.String()),
};

export const internalEndpointStubs = function (app: FastifyTypeboxInstance) {
  app.register(fastifyFormbody);
  app.register(fastifyCookie);
  app.register(nunjucksRender);

  app.get(
    getPath("root"),
    {
      schema: ConfigureInternalEndpointsGetSchema,
    },
    async function (request, reply) {
      return (
        await import("./handlers/internalEndpointStubs/configure/index.js")
      ).getHandler(request, reply);
    },
  );

  app.post(
    getPath("root"),
    {
      schema: ConfigureInternalEndpointsPostSchema,
    },
    async function (request, reply) {
      return (
        await import("./handlers/internalEndpointStubs/configure/index.js")
      ).postHandler(request, reply);
    },
  );

  app.post(
    getPath("requestObjectGenerator"),
    {
      schema: ConfigureInternalEndpointsPostSchema,
    },
    async function (request, reply) {
      //generate access token
      const token = await generateAccessToken(request);

      logger.debug("Token is" + token);

      const jwkString = await buildJWK(request.body as unknown as RequestBody);

      logger.debug("Jwk is" + jwkString);

      //Create a signed JWT of the Request object

      //Get private signing key for the client

      //Create a JAR by encrypting the JWT using a public encryption key for the respective client

      //returns the JAR

      return reply.send(token);
    },
  );

  app.get(
    "/temp-internal-endpoint-stub-example",
    async function (request, reply) {
      if (
        getCurrentInternalEndpointStubScenario(
          request,
          "accountManagementApi",
          "exampleEndpoint",
        ) === "scenario2"
      ) {
        return reply.send("scenario2 invoked");
      } else if (
        getCurrentInternalEndpointStubScenario(
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
