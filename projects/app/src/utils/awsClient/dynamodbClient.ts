import type { ScanCommandInput } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
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
import http from "node:http";
import https from "node:https";
import { getEnvironment } from "../getEnvironment/index.js";
import type { AppEnvironmentT } from "./getAppEnvironment.js";

const createDynamoDbClient = (environment: AppEnvironmentT) => {
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

export { createDynamoDbClient };
