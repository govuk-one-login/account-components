import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { getAppEnvironment } from "./getAppEnvironment.js";
import { getEnvironment } from "../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createSqsClient = () => {
  const sqsClient = new SQSClient(getAppEnvironment());

  const wrappedClient =
    getEnvironment() === "local"
      ? sqsClient
      : AWSXRay.captureAWSv3Client(sqsClient);

  return {
    sqsClient: wrappedClient,
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
