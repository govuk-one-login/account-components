import type { FastifyTypeboxInstance } from "../../app.js";
import * as Type from "@fastify/type-provider-typebox";
import { getPath } from "./handlers/utils/paths/index.js";
import {
  generateJwtToken,
  getScenario,
} from "../../stubs/tokenGenerator/index.js";
import { buildJar } from "../../stubs/buildJar/index.js";
import type {
  RequestBody,
  MockRequestObjectScenarios,
} from "../../stubs/types/common.js";
import { generateAccessToken } from "../../stubs/utils/access-token.js";

const ConfigureInternalEndpointsPostSchema = {
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

      const scenario: MockRequestObjectScenarios = getScenario(body);

      const token = await generateJwtToken(body, scenario);

      const encryptedJar = await buildJar(token);

      return reply.send(encryptedJar);
    },
  );
};
