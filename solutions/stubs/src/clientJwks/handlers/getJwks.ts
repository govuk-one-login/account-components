import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";
import { getParametersProvider } from "../../../../commons/utils/awsClient/index.js";
import assert from "node:assert";
import { createPublicKey } from "node:crypto";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { Algorithms, Kids } from "../../types/common.js";

export async function getJwks(request: FastifyRequest, reply: FastifyReply) {
  const parsedRequestParams = v.safeParse(
    v.object({
      client: v.string(),
    }),
    request.params,
  );

  if (!parsedRequestParams.success) {
    reply.status(400).send(parsedRequestParams.issues);
    return reply;
  }

  const clientRegistry = await getClientRegistry();
  const client = clientRegistry.find((client) => {
    return (
      client.client_name.toLowerCase() === parsedRequestParams.output.client
    );
  });

  if (!client) {
    request.log.warn(`Client '${parsedRequestParams.output.client}' not found`);
    reply.status(404).send();
    return reply;
  }

  assert.ok(
    process.env["MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME"],
    "Environment variable MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME is not set",
  );
  const publicKey = await getParametersProvider().get(
    process.env["MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME"],
  );
  assert.ok(publicKey, "Public key parameter is not set");

  const publicKeyObj = createPublicKey({
    key: publicKey,
    format: "pem",
    type: "spki",
  });

  const jwk = publicKeyObj.export({ format: "jwk" });

  const jwks = {
    keys: [
      {
        ...jwk,
        use: "sig",
        kid: Kids.EC,
        alg: Algorithms.EC,
      },
    ],
  };

  reply.send(jwks);
  return reply;
}
