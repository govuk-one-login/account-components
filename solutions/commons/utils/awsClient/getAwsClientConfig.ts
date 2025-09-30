import { NodeHttpHandler } from "@smithy/node-http-handler";
import { getNumberFromEnvVar } from "../getNumberFromEnvVar/index.js";
import { resolveEnvVarToBool } from "../resolveEnvVarToBool/index.js";
import http from "node:http";
import https from "node:https";

export const getAwsClientConfig = () => {
  return {
    region: process.env["AWS_REGION"] ?? "eu-west-2",
    maxAttempts: getNumberFromEnvVar("AWS_MAX_ATTEMPTS", 3),
    ...(resolveEnvVarToBool("USE_LOCALSTACK")
      ? {
          endpoint:
            process.env["LOCALSTACK_ENDPOINT"] ?? "http://localhost:4566",
          credentials: {
            accessKeyId: process.env["LOCALSTACK_ACCESS_KEY_ID"] ?? "test",
            secretAccessKey:
              process.env["LOCALSTACK_SECRET_ACCESS_KEY"] ?? "test",
          },
        }
      : {}),
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
