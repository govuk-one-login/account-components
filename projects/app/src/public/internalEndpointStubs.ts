import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import { nunjucksRender } from "../utils/nunjucksRender/index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import * as Type from "@fastify/type-provider-typebox";
import { getCurrentInternalEndpointStubScenario } from "./handlers/internalEndpointStubs/utils/config/index.js";
import { getPath } from "./handlers/internalEndpointStubs/utils/paths/index.js";
import {generateJwtToken, getScenario} from "../stubs/tokenGenerator/index.js";
import logger from "../stubs/utils/logger.js";
import type { RequestBody } from "../stubs/types/token.js";
import {buildJar} from "../stubs/buildJar/index.js";
import {Scenarios} from "../stubs/types/common.js";
import { generateAccessToken } from "../stubs/utils/access-token.js";
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

        const accessToken = await generateAccessToken(request.body as RequestBody)

        const scenario: Scenarios = getScenario(request.body as RequestBody);

        logger.info(`Scenario selected: ${JSON.stringify(scenario)}`);

        let body = request.body as RequestBody;
        body.access_token = accessToken;
        const token = await generateJwtToken(body, scenario, accessToken);

      logger.info(`Token is ${token}`);

        //Create a JAR by encrypting the JWT using a public encryption key for the respective client
        //eNCRYPT WITH RSA
      const encryptedJar = await buildJar(token);

      logger.info(`Encrypted JAR is: ${encryptedJar}`);

      return reply.send(encryptedJar);
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
