import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import assert from "node:assert";
import crypto from "node:crypto";
import { SignJWT } from "jose";
import type { ClientEntry } from "../../../../config/schema/types.js";

const getTokenRequestBody = async ({
  client,
  authCode,
}: {
  client: ClientEntry;
  authCode: string;
}) => {
  const clientAssertion = await new SignJWT({
    iss: client.client_id,
    aud: "TODO token URL from env var",
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "TODO alg of mock EC key" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign("TODO EC private key");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: "TODO this URL",
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
  });

  return params;
};

export async function handler(request: FastifyRequest, reply: FastifyReply) {
  assert.ok(reply.render);

  try {
    const parsedRequestParams = v.parse(
      v.object({
        client: v.string(),
      }),
      request.params,
      {
        abortEarly: false,
      },
    );

    const clientRegistry = await getClientRegistry();
    const client = clientRegistry.find((client) => {
      return client.client_name.toLowerCase() === parsedRequestParams.client;
    });

    if (!client) {
      throw new Error(`Client '${parsedRequestParams.client}' not found`);
    }

    const parsedRequestQueryParams = v.parse(
      v.union([
        v.object({
          code: v.string(),
          state: v.optional(v.string()),
        }),
        v.object({
          error: v.string(),
          error_description: v.string(),
          state: v.optional(v.string()),
        }),
      ]),
      request.query,
    );

    if ("code" in parsedRequestQueryParams) {
      // TODO request token
      // TODO journey outcome request
      // TODO output journey outcome
    }

    await reply.render("clientCallback/handlers/clientCallback.njk", {
      errorDetails: {
        client: `${client.client_name} (${client.client_id})`,
        ...parsedRequestQueryParams,
      },
    });
    return await reply;
  } catch (error) {
    await reply.render("clientCallback/handlers/clientCallback.njk", {
      exception: error,
    });
    return reply;
  }
}
