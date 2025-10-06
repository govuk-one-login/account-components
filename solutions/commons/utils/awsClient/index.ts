import { createDynamoDbClient } from "./dynamodbClient/index.js";
import { createSqsClient } from "./sqsClient/index.js";
import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";
import { getAwsClientConfig } from "./getAwsClientConfig/index.js";

let cachedDynamoDbClient: ReturnType<typeof createDynamoDbClient> | undefined;
const getDynamoDbClient = (): ReturnType<typeof createDynamoDbClient> => {
  cachedDynamoDbClient ??= createDynamoDbClient();
  return cachedDynamoDbClient;
};

let cachedSqsClient: ReturnType<typeof createSqsClient> | undefined;
const getSqsClient = (): ReturnType<typeof createSqsClient> => {
  cachedSqsClient ??= createSqsClient();
  return cachedSqsClient;
};

let cachedParametersProvider: SSMProvider | undefined;
const getParametersProvider = (): SSMProvider => {
  cachedParametersProvider ??= new SSMProvider({
    clientConfig: getAwsClientConfig(),
  });
  return cachedParametersProvider;
};

export { getDynamoDbClient, getSqsClient, getParametersProvider };
