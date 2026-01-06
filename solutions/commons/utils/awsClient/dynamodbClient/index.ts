import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type {
  BatchGetCommandInput,
  BatchWriteCommandInput,
  DeleteCommandInput,
  GetCommandInput,
  PutCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  TransactWriteCommandInput,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as AWSXRay from "aws-xray-sdk";
import { getEnvironment } from "../../getEnvironment/index.js";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";

const createDynamoDbClient = () => {
  const dynamoDbClient = new DynamoDBClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? dynamoDbClient
      : AWSXRay.captureAWSv3Client(dynamoDbClient);

  const docClient = DynamoDBDocumentClient.from(wrappedClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  const client = {
    client: docClient,
    config: docClient.config,
    put: async (params: PutCommandInput) => {
      const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new PutCommand(params));
    },
    get: async (params: GetCommandInput) => {
      const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new GetCommand(params));
    },
    delete: async (params: DeleteCommandInput) => {
      const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new DeleteCommand(params));
    },
    update: async (params: UpdateCommandInput) => {
      const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new UpdateCommand(params));
    },
    query: async (params: QueryCommandInput) => {
      const { QueryCommand } = await import("@aws-sdk/client-dynamodb");
      return await docClient.send(new QueryCommand(params));
    },
    scan: async (params: ScanCommandInput) => {
      const { ScanCommand } = await import("@aws-sdk/client-dynamodb");
      return await docClient.send(new ScanCommand(params));
    },
    batchWrite: async (params: BatchWriteCommandInput) => {
      const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new BatchWriteCommand(params));
    },
    batchGet: async (params: BatchGetCommandInput) => {
      const { BatchGetCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new BatchGetCommand(params));
    },
    transactWrite: async (params: TransactWriteCommandInput) => {
      const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await docClient.send(new TransactWriteCommand(params));
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
