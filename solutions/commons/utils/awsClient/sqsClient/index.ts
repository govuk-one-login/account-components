import type {
  DeleteMessageCommandInput,
  ReceiveMessageCommandInput,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { SQSClient } from "@aws-sdk/client-sqs";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import { tracer } from "../tracer.js";

const createSqsClient = () => {
  const sqsClient = new SQSClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? sqsClient
      : tracer.captureAWSv3Client(sqsClient);

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

let cachedSqsClient: ReturnType<typeof createSqsClient> | undefined;
const getSqsClient = (): ReturnType<typeof createSqsClient> => {
  cachedSqsClient ??= createSqsClient();
  return cachedSqsClient;
};

export { getSqsClient };
