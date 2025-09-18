import { getNumberFromEnvVar } from "../getNumberFromEnvVar/index.js";
import { resolveEnvVarToBool } from "../resolveEnvVarToBool/index.js";

export interface AppEnvironmentT {
  awsMaxAttempts: number;
  awsClientRequestTimeout: number;
  awsClientConnectTimeout: number;
  region: string;
  useLocalstack: boolean;
  localstackHost: string;
  localstackAccessKeyId: string;
  localstackSecretAccessKey: string;
}
export const getAppEnvironment = (): AppEnvironmentT => {
  return {
    awsMaxAttempts: getNumberFromEnvVar("AWS_MAX_ATTEMPTS", 3),
    awsClientRequestTimeout: getNumberFromEnvVar(
      "AWS_CLIENT_REQUEST_TIMEOUT",
      10000,
    ),
    awsClientConnectTimeout: getNumberFromEnvVar(
      "AWS_CLIENT_CONNECT_TIMEOUT",
      10000,
    ),
    region: process.env["AWS_REGION"] ?? "eu-west-2",
    useLocalstack: resolveEnvVarToBool("USE_LOCALSTACK"),
    localstackHost:
      process.env["LOCALSTACK_ENDPOINT"] ?? "http://localhost:4566",
    localstackAccessKeyId: process.env["LOCALSTACK_ACCESS_KEY_ID"] ?? "test",
    localstackSecretAccessKey:
      process.env["LOCALSTACK_SECRET_ACCESS_KEY"] ?? "test",
  };
};
