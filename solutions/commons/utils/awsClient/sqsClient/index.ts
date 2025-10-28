import type {
  DeleteMessageCommandInput,
  ReceiveMessageCommandInput,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { SQSClient } from "@aws-sdk/client-sqs";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createSqsClient = () => {
  const sqsClient = new SQSClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? sqsClient
      : AWSXRay.captureAWSv3Client(sqsClient);

  return {
    client: wrappedClient,
    config: wrappedClient.config,
    sendMessage: async (params: SendMessageCommandInput) => {
      const { SendMessageCommand } = await import("@aws-sdk/client-sqs");
      return await wrappedClient.send(new SendMessageCommand(params));
    },
    receiveMessage: async (params: ReceiveMessageCommandInput) => {
      const { ReceiveMessageCommand } = await import("@aws-sdk/client-sqs");
      return await wrappedClient.send(new ReceiveMessageCommand(params));
    },
    deleteMessage: async (params: DeleteMessageCommandInput) => {
      const { DeleteMessageCommand } = await import("@aws-sdk/client-sqs");
      return await wrappedClient.send(new DeleteMessageCommand(params));
    },
  };
};

export { createSqsClient };
