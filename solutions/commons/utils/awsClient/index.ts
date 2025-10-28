import type { createDynamoDbClient as createDynamoDbClientForType } from "./dynamodbClient/index.js";
import type { createSqsClient as createSqsClientForType } from "./sqsClient/index.js";
import type { createKmsClient as createKmsClientForType } from "./kmsClient/index.js";
import type { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";
import type { createAppConfigClient as createAppConfigClientForType } from "./appconfigClient/index.js";
import { getAwsClientConfig } from "./getAwsClientConfig/index.js";

let cachedDynamoDbClient:
  | ReturnType<typeof createDynamoDbClientForType>
  | undefined;
const getDynamoDbClient = async (): Promise<
  ReturnType<typeof createDynamoDbClientForType>
> => {
  cachedDynamoDbClient ??= (
    await import("./dynamodbClient/index.js")
  ).createDynamoDbClient();
  return cachedDynamoDbClient;
};

let cachedSqsClient: ReturnType<typeof createSqsClientForType> | undefined;
const getSqsClient = async (): Promise<
  ReturnType<typeof createSqsClientForType>
> => {
  cachedSqsClient ??= (await import("./sqsClient/index.js")).createSqsClient();
  return cachedSqsClient;
};

let cachedKmsClient: ReturnType<typeof createKmsClientForType> | undefined;
const getKmsClient = async (): Promise<
  ReturnType<typeof createKmsClientForType>
> => {
  cachedKmsClient ??= (await import("./kmsClient/index.js")).createKmsClient();
  return cachedKmsClient;
};

let cachedParametersProvider: SSMProvider | undefined;
const getParametersProvider = async (): Promise<SSMProvider> => {
  const { SSMProvider } = await import("@aws-lambda-powertools/parameters/ssm");
  cachedParametersProvider ??= new SSMProvider({
    clientConfig: getAwsClientConfig(),
  });
  return cachedParametersProvider;
};

let cachedAppConfigClient:
  | ReturnType<typeof createAppConfigClientForType>
  | undefined;
const getAppConfigClient = async (): Promise<
  ReturnType<typeof createAppConfigClientForType>
> => {
  cachedAppConfigClient ??= (
    await import("./appconfigClient/index.js")
  ).createAppConfigClient();
  return cachedAppConfigClient;
};

export {
  getDynamoDbClient,
  getSqsClient,
  getParametersProvider,
  getAppConfigClient,
  getKmsClient,
};
