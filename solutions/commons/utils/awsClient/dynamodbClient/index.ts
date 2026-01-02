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
  
  const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
  logger.info("docClient created", { docClient });

  let wrappedClient: DynamoDBDocumentClient;
  logger.info("env", getEnvironment())
  if (getEnvironment() === "local") {
    wrappedClient = docClient;
    logger.info("Without X Ray")
  } else {
    wrappedClient = AWSXRay.captureAWSv3Client(docClient);
    logger.info("With X Ray")
  }

  const client = {
    client: wrappedClient,
    config: wrappedClient.config,
    put: async (params: PutCommandInput) => {
      const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new PutCommand(params));
    },
    get: async (params: GetCommandInput) => {
      const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new GetCommand(params));
    },
    delete: async (params: DeleteCommandInput) => {
      const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new DeleteCommand(params));
    },
    update: async (params: UpdateCommandInput) => {
      const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new UpdateCommand(params));
    },
    query: async (params: QueryCommandInput) => {
      const { QueryCommand } = await import("@aws-sdk/client-dynamodb");
      return await wrappedClient.send(new QueryCommand(params));
    },
    scan: async (params: ScanCommandInput) => {
      const { ScanCommand } = await import("@aws-sdk/client-dynamodb");
      return await wrappedClient.send(new ScanCommand(params));
    },
    batchWrite: async (params: BatchWriteCommandInput) => {
      const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new BatchWriteCommand(params));
    },
    batchGet: async (params: BatchGetCommandInput) => {
      const { BatchGetCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new BatchGetCommand(params));
    },
    transactWrite: async (params: TransactWriteCommandInput) => {
      const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await wrappedClient.send(new TransactWriteCommand(params));
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
