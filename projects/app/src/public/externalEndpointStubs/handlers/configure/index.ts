import type { FastifyReply } from "fastify";
import assert from "node:assert";
import {
  generateExternalEndpointStubConfigCookieKey,
  getCurrentExternalEndpointStubScenario,
  externalEndpointStubsConfig,
} from "../utils/config/index.js";
import type {
  ConfigureExternalEndpointsGetSchema,
  ConfigureExternalEndpointsPostSchema,
} from "../../index.js";
import { getEnvironment } from "../../../../utils/getEnvironment/index.js";
import { getPath } from "../utils/paths/index.js";
import type { FastifyRequestWithSchema } from "../../../../app.js";

export async function getHandler(
  request: FastifyRequestWithSchema<typeof ConfigureExternalEndpointsGetSchema>,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  return reply.render(
    "public/externalEndpointStubs/handlers/configure/index.njk",
    {
      showSuccessMessage: request.query.updated === 1,
      externalEndpointStubsConfig,
      getCurrentExternalEndpointStubScenario: (
        group: Parameters<typeof getCurrentExternalEndpointStubScenario>[1],
        endpoint: Parameters<typeof getCurrentExternalEndpointStubScenario>[2],
      ) => getCurrentExternalEndpointStubScenario(request, group, endpoint),
      generateExternalEndpointStubConfigCookieKey,
    },
  );
}

export async function postHandler(
  request: FastifyRequestWithSchema<
    typeof ConfigureExternalEndpointsPostSchema
  >,
  reply: FastifyReply,
) {
  Object.entries(request.body).forEach(([key, value]) => {
    for (const [groupKey, groupValue] of Object.entries(
      externalEndpointStubsConfig,
    )) {
      if (
        Object.entries(groupValue).some(([endpointKey, endpointValue]) => {
          return (
            generateExternalEndpointStubConfigCookieKey(
              groupKey,
              endpointKey,
            ) === key &&
            // @ts-expect-error
            endpointValue.includes(value)
          );
        })
      ) {
        reply.setCookie(key, value, {
          httpOnly: true,
          maxAge: 31536000,
          sameSite: "lax",
          secure: getEnvironment() !== "local",
        });
        break;
      }
    }
  });

  return reply.redirect(`${getPath("configure", true)}?updated=1`);
}
