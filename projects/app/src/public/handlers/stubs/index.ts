import type { FastifyReply } from "fastify";
import assert from "node:assert";
import {
  generateStubConfigCookieKey,
  getCurrentStubScenario,
  stubsConfig,
} from "./utils/stubsConfig/index.js";
import type { StubsGetSchema, StubsPostSchema } from "../../stubs.js";
import { getEnvironment } from "../../../utils/getEnvironment/index.js";
import { getPath } from "./utils/paths/index.js";
import type { FastifyRequestWithSchema } from "../../../app.js";

const templatePath = "public/handlers/stubs/index.njk";

export async function getHandler(
  request: FastifyRequestWithSchema<typeof StubsGetSchema>,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  return reply.render(templatePath, {
    showSuccessMessage: request.query.updated === 1,
    stubsConfig,
    getCurrentStubScenario: (
      group: Parameters<typeof getCurrentStubScenario>[1],
      endpoint: Parameters<typeof getCurrentStubScenario>[2],
    ) => getCurrentStubScenario(request, group, endpoint),
    generateStubConfigCookieKey,
  });
}

export async function postHandler(
  request: FastifyRequestWithSchema<typeof StubsPostSchema>,
  reply: FastifyReply,
) {
  Object.entries(request.body).forEach(([key, value]) => {
    for (const [groupKey, groupValue] of Object.entries(stubsConfig)) {
      for (const [endpointKey, endpointValue] of Object.entries(groupValue)) {
        if (
          generateStubConfigCookieKey(groupKey, endpointKey) === key &&
          // @ts-expect-error
          endpointValue.includes(value)
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
      break;
    }
  });

  return reply.redirect(`${getPath("root", true)}?updated=1`);
}
