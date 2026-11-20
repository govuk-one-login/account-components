import { NodeHttpHandler } from "@smithy/node-http-handler";
import http from "node:http";
import https from "node:https";
import assert from "node:assert";
import { env } from "../env.js";

export const getAwsClientConfig = (kms = false) => {
  assert.ok(process.env["AWS_REGION"], "AWS_REGION is not set");

  return {
    region: process.env["AWS_REGION"],
    maxAttempts: 3,
    ...(() => {
      if (!env.USE_LOCAL_AWS) {
        return {};
      }

      assert.ok(env.LOCAL_AWS_ENDPOINT, "LOCAL_AWS_ENDPOINT is not set");
      assert.ok(
        env.LOCAL_AWS_ACCESS_KEY_ID,
        "LOCAL_AWS_ACCESS_KEY_ID is not set",
      );
      assert.ok(env.LOCAL_AWS_ACCESS_KEY, "LOCAL_AWS_ACCESS_KEY is not set");
      assert.ok(
        env.LOCAL_AWS_KMS_ENDPOINT,
        "LOCAL_AWS_KMS_ENDPOINT is not set",
      );

      return {
        endpoint: kms ? env.LOCAL_AWS_KMS_ENDPOINT : env.LOCAL_AWS_ENDPOINT,
        credentials: {
          accessKeyId: env.LOCAL_AWS_ACCESS_KEY_ID,
          secretAccessKey: env.LOCAL_AWS_ACCESS_KEY,
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
      }),
    }),
  };
};
