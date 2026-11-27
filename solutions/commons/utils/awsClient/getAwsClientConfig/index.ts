import { NodeHttpHandler } from "@smithy/node-http-handler";
import { resolveEnvVarToBool } from "../../resolveEnvVarToBool/index.js";
import http from "node:http";
import https from "node:https";
import assert from "node:assert";

export const getAwsClientConfig = () => {
  assert.ok(process.env["AWS_REGION"], "AWS_REGION is not set");

  const useLocalAws = resolveEnvVarToBool("USE_LOCAL_AWS");

  return {
    region: process.env["AWS_REGION"],
    maxAttempts: 3,
    ...(() => {
      if (!useLocalAws) {
        return {};
      }

      assert.ok(
        process.env["LOCAL_AWS_ENDPOINT"],
        "LOCAL_AWS_ENDPOINT is not set",
      );
      assert.ok(
        process.env["LOCAL_AWS_ACCESS_KEY_ID"],
        "LOCAL_AWS_ACCESS_KEY_ID is not set",
      );
      assert.ok(
        process.env["LOCAL_AWS_ACCESS_KEY"],
        "LOCAL_AWS_ACCESS_KEY is not set",
      );

      return {
        endpoint: process.env["LOCAL_AWS_ENDPOINT"],
        credentials: {
          accessKeyId: process.env["LOCAL_AWS_ACCESS_KEY_ID"],
          secretAccessKey: process.env["LOCAL_AWS_ACCESS_KEY"],
        },
      };
    })(),
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 10000,
      requestTimeout: 10000,
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50,
        rejectUnauthorized: !useLocalAws,
      }),
    }),
  };
};
