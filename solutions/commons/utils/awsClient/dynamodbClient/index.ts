import type { ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type {
  PutCommandInput,
  GetCommandInput,
  DeleteCommandInput,
  UpdateCommandInput,
  QueryCommandInput,
  BatchGetCommandInput,
  BatchWriteCommandInput,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as AWSXRay from "aws-xray-sdk";
import { getEnvironment } from "../../getEnvironment/index.js";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { logger } from "../../logger/index.js";

const createDynamoDbClient = () => {
  const config = getAwsClientConfig();
  logger.info("client config", config)
  const dynamoDbClient = new DynamoDBClient(config);
  logger.info("client created", { dynamoDbClient });

  let wrappedClient: DynamoDBClient;
  logger.info("env", getEnvironment())
  if (getEnvironment() === "local") {
    wrappedClient = dynamoDbClient;
    logger.info("Without X Ray")
  } else {
    wrappedClient = AWSXRay.captureAWSv3Client(dynamoDbClient);
    logger.info("With X Ray")
  }

  const docClient = DynamoDBDocumentClient.from(wrappedClient);
  logger.info("docClient created", { docClient });

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
