import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getAwsClientConfig } from "./getAwsClientConfig.js";

const createDynamoDbClient = () => {
  const dynamoDbClient = new DynamoDBClient(getAwsClientConfig());

  const docClient = DynamoDBDocumentClient.from(dynamoDbClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  const client = {
    client: docClient,
    config: docClient.config,
    query: async (params: QueryCommandInput) => {
      const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new QueryCommand(params));
    },
  };
  return client;
};

let cachedDynamoDbClient: ReturnType<typeof createDynamoDbClient> | undefined;
const getDynamoDbClient = (): ReturnType<typeof createDynamoDbClient> => {
  cachedDynamoDbClient ??= createDynamoDbClient();
  return cachedDynamoDbClient;
};

export { getDynamoDbClient };
