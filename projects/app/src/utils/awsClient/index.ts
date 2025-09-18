import { createDynamoDbClient } from "./dynamodbClient.js";
import { getAppEnvironment } from "./getAppEnvironment.js";

let cachedClient: ReturnType<typeof createDynamoDbClient> | undefined;
const getDynamoDbClient = (): ReturnType<typeof createDynamoDbClient> => {
  cachedClient ??= createDynamoDbClient(getAppEnvironment());
  return cachedClient;
};

export { getDynamoDbClient };
