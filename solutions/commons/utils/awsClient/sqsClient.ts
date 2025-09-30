import { SQSClient } from "@aws-sdk/client-sqs";
import { getAwsClientConfig } from "./getAwsClientConfig.js";
import { getEnvironment } from "../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createSqsClient = () => {
  const sqsClient = new SQSClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? sqsClient
      : AWSXRay.captureAWSv3Client(sqsClient);

  return {
    sqsClient: wrappedClient,
    config: wrappedClient.config,
    sendMessage: async (params: { QueueUrl: string; MessageBody: string }) => {
      const { SendMessageCommand } = await import("@aws-sdk/client-sqs");
      return await wrappedClient.send(new SendMessageCommand(params));
    },
    receiveMessage: async (params: {
      QueueUrl: string;
      MaxNumberOfMessages?: number;
      WaitTimeSeconds?: number;
      VisibilityTimeout?: number;
    }) => {
      const { ReceiveMessageCommand } = await import("@aws-sdk/client-sqs");
      return await wrappedClient.send(new ReceiveMessageCommand(params));
    },
    deleteMessage: async (params: {
      QueueUrl: string;
      ReceiptHandle: string;
    }) => {
      const { DeleteMessageCommand } = await import("@aws-sdk/client-sqs");
      return await wrappedClient.send(new DeleteMessageCommand(params));
    },
  };
};

export { createSqsClient };
