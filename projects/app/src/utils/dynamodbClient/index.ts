import type { ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
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
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  BatchGetCommand,
  TransactWriteCommand,
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

const getDynamoDbClient = () => {
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
    send: docClient.send.bind(docClient),
    put: (params: PutCommandInput) => docClient.send(new PutCommand(params)),
    get: (params: GetCommandInput) => docClient.send(new GetCommand(params)),
    delete: (params: DeleteCommandInput) =>
      docClient.send(new DeleteCommand(params)),
    update: (params: UpdateCommandInput) =>
      docClient.send(new UpdateCommand(params)),
    query: (params: QueryCommandInput) =>
      docClient.send(new QueryCommand(params)),
    scan: (params: ScanCommandInput) => docClient.send(new ScanCommand(params)),
    batchWrite: (params: BatchWriteCommandInput) =>
      docClient.send(new BatchWriteCommand(params)),
    batchGet: (params: BatchGetCommandInput) =>
      docClient.send(new BatchGetCommand(params)),
    transactWrite: (params: TransactWriteCommandInput) =>
      docClient.send(new TransactWriteCommand(params)),
  };
  return client;
};

export { getDynamoDbClient };
