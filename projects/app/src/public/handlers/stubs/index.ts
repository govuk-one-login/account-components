import type { FastifyReply } from "fastify";
import assert from "node:assert";
import {
  getCurrentStubScenario,
  stubsConfig,
} from "./utils/getStubsConfig/index.js";
import type { StubsGetSchema, StubsPostSchema } from "../../stubs.js";
import { getEnvironment } from "../../../utils/getEnvironment/index.js";
import { getPath } from "./utils/paths.js";
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
  });
}

export async function postHandler(
  request: FastifyRequestWithSchema<typeof StubsPostSchema>,
  reply: FastifyReply,
) {
  assert.ok(reply.render);

  Object.entries(request.body).forEach(([key, value]) => {
    for (const groupValue of Object.values(stubsConfig)) {
      for (const endpointValue of Object.values(groupValue)) {
        if (
          endpointValue.cookieKey === key &&
          // @ts-expect-error
          endpointValue.scenarios.includes(value)
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
