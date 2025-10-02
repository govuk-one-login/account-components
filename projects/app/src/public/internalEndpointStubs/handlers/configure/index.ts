import type { FastifyReply } from "fastify";
import {
  generateInternalEndpointStubConfigCookieKey,
  internalEndpointStubsConfig,
} from "../utils/config/index.js";
import type { ConfigureInternalEndpointsPostSchema } from "../../index.js";
import { getEnvironment } from "../../../../utils/getEnvironment/index.js";
import { getPath } from "../utils/paths/index.js";
import type { FastifyRequestWithSchema } from "../../../../app.js";

export async function postHandler(
  request: FastifyRequestWithSchema<
    typeof ConfigureInternalEndpointsPostSchema
  >,
  reply: FastifyReply,
) {
  for (const [key, value] of Object.entries(request.body)) {
    for (const [groupKey, groupValue] of Object.entries(
      internalEndpointStubsConfig,
    )) {
      const match = Object.entries(groupValue).some(
        ([endpointKey, endpointValue]) => {
          return (
            generateInternalEndpointStubConfigCookieKey(
              groupKey,
              endpointKey,
            ) === key &&
            // @ts-expect-error
            endpointValue.includes(value)
          );
        },
      );

      if (match) {
        reply.setCookie(key, value, {
          httpOnly: true,
          maxAge: 31536000,
          sameSite: "lax",
          secure: getEnvironment() !== "local",
        });
        break; // Stop looping groupValue entries
      }
    }
  }
  return reply.redirect(`${getPath("root", true)}?updated=1`);
}
