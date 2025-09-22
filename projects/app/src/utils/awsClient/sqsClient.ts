import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { AppEnvironmentT } from "./getAppEnvironment.js";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import http from "http";
import https from "https";
import { getEnvironment } from "../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createSqsClient = (environment: AppEnvironmentT) => {
  const sqsClient = new SQSClient({
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
      ? sqsClient
      : AWSXRay.captureAWSv3Client(sqsClient);

  return {
    config: wrappedClient.config,
    sendMessage: async (params: { QueueUrl: string; MessageBody: string }) => {
      return await wrappedClient.send(new SendMessageCommand(params));
    },
    receiveMessage: async (params: {
      QueueUrl: string;
      MaxNumberOfMessages?: number;
      WaitTimeSeconds?: number;
      VisibilityTimeout?: number;
    }) => {
      return await wrappedClient.send(new ReceiveMessageCommand(params));
    },
    deleteMessage: async (params: {
      QueueUrl: string;
      ReceiptHandle: string;
    }) => {
      return await wrappedClient.send(new DeleteMessageCommand(params));
    },
  };
};

export { createSqsClient };
