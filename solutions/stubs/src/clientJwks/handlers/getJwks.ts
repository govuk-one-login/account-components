import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";
import { getParametersProvider } from "../../../../commons/utils/awsClient/ssmClient/index.js";
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
  const client = clientRegistry.find((client: { client_name: string }) => {
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
  assert.ok(
    process.env["MOCK_CLIENT_RSA_PUBLIC_KEY_SSM_NAME"],
    "Environment variable MOCK_CLIENT_RSA_PUBLIC_KEY_SSM_NAME is not set",
  );

  const [ecPublicKey, rsaPublicKey] = await Promise.all([
    getParametersProvider().get(
      process.env["MOCK_CLIENT_EC_PUBLIC_KEY_SSM_NAME"],
    ),
    getParametersProvider().get(
      process.env["MOCK_CLIENT_RSA_PUBLIC_KEY_SSM_NAME"],
    ),
  ]);

  assert.ok(ecPublicKey, "EC public key parameter is not set");
  assert.ok(rsaPublicKey, "RSA public key parameter is not set");

  const ecPublicKeyObj = createPublicKey({
    key: ecPublicKey,
    format: "pem",
    type: "spki",
  });

  const rsaPublicKeyObj = createPublicKey({
    key: rsaPublicKey,
    format: "pem",
    type: "spki",
  });

  const ecJwk = ecPublicKeyObj.export({ format: "jwk" });
  const rsaJwk = rsaPublicKeyObj.export({ format: "jwk" });

  const jwks = {
    keys: [
      {
        ...ecJwk,
        use: "sig",
        kid: Kids.EC,
        alg: Algorithms.EC,
      },
      {
        ...rsaJwk,
        use: "sig",
        kid: Kids.RSA,
        alg: Algorithms.RSA,
      },
    ],
  };

  reply.send(jwks);
  return reply;
}
