import type { FastifyTypeboxInstance } from "../app.js";
import * as Type from "@fastify/type-provider-typebox";
import { getPath } from "./handlers/internalEndpointStubs/utils/paths/index.js";
import {
  generateJwtToken,
  getScenario,
} from "../stubs/tokenGenerator/index.js";
import logger from "../stubs/utils/logger.js";
import type { RequestBody } from "../stubs/types/token.js";
import { buildJar } from "../stubs/buildJar/index.js";
import type { Scenarios } from "../stubs/types/common.js";
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
  app.post(
    getPath("requestObjectGenerator"),
    {
      schema: ConfigureInternalEndpointsPostSchema,
    },
    async function (request, reply) {
      const body = request.body as unknown as RequestBody;

      const accessToken = await generateAccessToken(body);
      body.access_token = accessToken;

      const scenario: Scenarios = getScenario(body);
      logger.info(`Scenario selected: ${JSON.stringify(scenario)}`);

      const token = await generateJwtToken(body, scenario);

      logger.info(`Token is ${token}`);

      const encryptedJar = await buildJar(token);

      logger.info(`Encrypted JAR is: ${encryptedJar}`);

      return reply.send(encryptedJar);
    },
  );
};
