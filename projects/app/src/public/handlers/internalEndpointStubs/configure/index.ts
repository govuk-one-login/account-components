import type { FastifyReply } from "fastify";
import assert from "node:assert";
import {
  generateInternalEndpointStubConfigCookieKey,
  getCurrentInternalEndpointStubScenario,
  internalEndpointStubsConfig,
} from "../utils/config/index.js";
import type {
  ConfigureInternalEndpointsGetSchema,
  ConfigureInternalEndpointsPostSchema,
} from "../../../internalEndpointStubs.js";
import { getEnvironment } from "../../../../utils/getEnvironment/index.js";
import { getPath } from "../utils/paths/index.js";
import type { FastifyRequestWithSchema } from "../../../../app.js";

export async function getHandler(
  request: FastifyRequestWithSchema<typeof ConfigureInternalEndpointsGetSchema>,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  return reply.render(
    "public/handlers/internalEndpointStubs/configure/index.njk",
    {
      showSuccessMessage: request.query.updated === 1,
      internalEndpointStubsConfig,
      getCurrentInternalEndpointStubScenario: (
        group: Parameters<typeof getCurrentInternalEndpointStubScenario>[1],
        endpoint: Parameters<typeof getCurrentInternalEndpointStubScenario>[2],
      ) => getCurrentInternalEndpointStubScenario(request, group, endpoint),
      generateInternalEndpointStubConfigCookieKey,
    },
  );
}

export async function postHandler(
  request: FastifyRequestWithSchema<
    typeof ConfigureInternalEndpointsPostSchema
  >,
  reply: FastifyReply,
) {
  Object.entries(request.body).forEach(([key, value]) => {
    for (const [groupKey, groupValue] of Object.entries(
      internalEndpointStubsConfig,
    )) {
      if (
        Object.entries(groupValue).find(([endpointKey, endpointValue]) => {
          return (
            generateInternalEndpointStubConfigCookieKey(
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

  return reply.redirect(`${getPath("root", true)}?updated=1`);
}
