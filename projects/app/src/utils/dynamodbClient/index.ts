import type { ScanCommandInput } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { getNumberFromEnvVar } from "../getNumberFromEnvVar/index.js";
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
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import * as AWSXRay from "aws-xray-sdk";
import http from "http";
import https from "https";
import { resolveEnvVarToBool } from "../resolveEnvVarToBool/index.js";
import { getEnvironment } from "../getEnvironment/index.js";

interface AppEnvironmentT {
  awsMaxAttempts: number;
  awsClientRequestTimeout: number;
  awsClientConnectTimeout: number;
  region: string;
  useLocalstack: boolean;
  localstackHost: string;
  localstackAccessKeyId: string;
  localstackSecretAccessKey: string;
}

const getAppEnvironment = (): AppEnvironmentT => {
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

const createDynamoDbClient = () => {
  const environment = getAppEnvironment();
  const dynamoDbClient = new DynamoDBClient({
    region: environment.region,
    maxAttempts: environment.awsMaxAttempts,
    ...(environment.useLocalstack
      ? {
          endpoint: environment.localstackHost,
          credentials: {
            accessKeyId: environment.localstackAccessKeyId,
            secretAccessKey: environment.localstackSecretAccessKey,
          },
        }
      : {}),
    requestHandler: new NodeHttpHandler({
      connectionTimeout: environment.awsClientConnectTimeout,
      requestTimeout: environment.awsClientRequestTimeout,
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
    }),
  });

  const wrappedClient =
    getEnvironment() === "local"
      ? dynamoDbClient
      : AWSXRay.captureAWSv3Client(dynamoDbClient);

  const docClient = DynamoDBDocumentClient.from(wrappedClient);

  const client = {
    config: docClient.config,
    send: async (command: Parameters<typeof docClient.send>[0]) => {
      return await docClient.send(command);
    },
    put: async (params: PutCommandInput) => {
      return await docClient.send(new PutCommand(params));
    },
    get: async (params: GetCommandInput) => {
      return await docClient.send(new GetCommand(params));
    },
    delete: async (params: DeleteCommandInput) => {
      return await docClient.send(new DeleteCommand(params));
    },
    update: async (params: UpdateCommandInput) => {
      return await docClient.send(new UpdateCommand(params));
    },
    query: async (params: QueryCommandInput) => {
      return await docClient.send(new QueryCommand(params));
    },
    scan: async (params: ScanCommandInput) => {
      return await docClient.send(new ScanCommand(params));
    },
    batchWrite: async (params: BatchWriteCommandInput) => {
      return await docClient.send(new BatchWriteCommand(params));
    },
    batchGet: async (params: BatchGetCommandInput) => {
      return await docClient.send(new BatchGetCommand(params));
    },
    transactWrite: async (params: TransactWriteCommandInput) => {
      return await docClient.send(new TransactWriteCommand(params));
    },
  };
  return client;
};

let cachedClient: ReturnType<typeof createDynamoDbClient> | undefined;
const getDynamoDbClient = (): ReturnType<typeof createDynamoDbClient> => {
  cachedClient ??= createDynamoDbClient();
  return cachedClient;
};

export { getDynamoDbClient };
