import { NodeHttpHandler } from "@smithy/node-http-handler";
import { getNumberFromEnvVar } from "../../getNumberFromEnvVar/index.js";
import { resolveEnvVarToBool } from "../../resolveEnvVarToBool/index.js";
import http from "node:http";
import https from "node:https";
import assert from "node:assert";

export const getAwsClientConfig = () => {
  assert.ok(process.env["AWS_REGION"], "AWS_REGION is not set");

  return {
    region: process.env["AWS_REGION"],
    maxAttempts: getNumberFromEnvVar("AWS_MAX_ATTEMPTS", 3),
    ...(() => {
      if (!resolveEnvVarToBool("USE_LOCALSTACK")) {
        return {};
      }

      assert.ok(
        process.env["LOCALSTACK_ENDPOINT"],
        "LOCALSTACK_ENDPOINT is not set",
      );
      assert.ok(
        process.env["LOCALSTACK_ACCESS_KEY_ID"],
        "LOCALSTACK_ACCESS_KEY_ID is not set",
      );
      assert.ok(
        process.env["LOCALSTACK_ACCESS_KEY"],
        "LOCALSTACK_ACCESS_KEY is not set",
      );

      return {
        endpoint: process.env["LOCALSTACK_ENDPOINT"],
        credentials: {
          accessKeyId: process.env["LOCALSTACK_ACCESS_KEY_ID"],
          secretAccessKey: process.env["LOCALSTACK_ACCESS_KEY"],
        },
      };
    })(),
    requestHandler: new NodeHttpHandler({
      connectionTimeout: getNumberFromEnvVar(
        "AWS_CLIENT_CONNECT_TIMEOUT",
        10000,
      ),
      requestTimeout: getNumberFromEnvVar("AWS_CLIENT_REQUEST_TIMEOUT", 10000),
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
    }),
  };
};
