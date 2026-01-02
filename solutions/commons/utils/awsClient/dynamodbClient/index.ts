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
  
  let wrappedBaseClient: DynamoDBClient;
  logger.info("env", getEnvironment())
  // Force X-Ray wrapping for testing
  wrappedBaseClient = AWSXRay.captureAWSv3Client(dynamoDbClient);
  logger.info("With X Ray (forced)");
  
  const docClient = DynamoDBDocumentClient.from(wrappedBaseClient);
  const finalWrappedClient = AWSXRay.captureAWSv3Client(docClient);
  logger.info("docClient created and wrapped", { docClient: finalWrappedClient });

  const client = {
    client: finalWrappedClient,
    config: finalWrappedClient.config,
    put: async (params: PutCommandInput) => {
      const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new PutCommand(params));
    },
    get: async (params: GetCommandInput) => {
      const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new GetCommand(params));
    },
    delete: async (params: DeleteCommandInput) => {
      const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new DeleteCommand(params));
    },
    update: async (params: UpdateCommandInput) => {
      const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new UpdateCommand(params));
    },
    query: async (params: QueryCommandInput) => {
      const { QueryCommand } = await import("@aws-sdk/client-dynamodb");
      return await finalWrappedClient.send(new QueryCommand(params));
    },
    scan: async (params: ScanCommandInput) => {
      const { ScanCommand } = await import("@aws-sdk/client-dynamodb");
      return await finalWrappedClient.send(new ScanCommand(params));
    },
    batchWrite: async (params: BatchWriteCommandInput) => {
      const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new BatchWriteCommand(params));
    },
    batchGet: async (params: BatchGetCommandInput) => {
      const { BatchGetCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new BatchGetCommand(params));
    },
    transactWrite: async (params: TransactWriteCommandInput) => {
      const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");
      return await finalWrappedClient.send(new TransactWriteCommand(params));
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
