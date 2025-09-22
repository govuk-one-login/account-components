import { createDynamoDbClient } from "./dynamodbClient.js";
import { getAppEnvironment } from "./getAppEnvironment.js";
import { createSqsClient } from "./sqsClient.js";

let cachedDynamoDbClient: ReturnType<typeof createDynamoDbClient> | undefined;
const getDynamoDbClient = (): ReturnType<typeof createDynamoDbClient> => {
  cachedDynamoDbClient ??= createDynamoDbClient(getAppEnvironment());
  return cachedDynamoDbClient;
};

let cachedSqsClient: ReturnType<typeof createSqsClient> | undefined;
const getSqsClient = (): ReturnType<typeof createSqsClient> => {
  cachedSqsClient ??= createSqsClient(getAppEnvironment());
  return cachedSqsClient;
};

export { getDynamoDbClient, getSqsClient };
