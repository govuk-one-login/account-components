import type { ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import { SQSClient } from "@aws-sdk/client-sqs";
import { getAwsClientConfig } from "./getAwsClientConfig.js";

const createSqsClient = () => {
  const sqsClient = new SQSClient(getAwsClientConfig());

  return {
    client: sqsClient,
    config: sqsClient.config,
    receiveMessage: async (params: ReceiveMessageCommandInput) => {
      const { ReceiveMessageCommand } = await import("@aws-sdk/client-sqs");
      return await sqsClient.send(new ReceiveMessageCommand(params));
    },
  };
};

let cachedSqsClient: ReturnType<typeof createSqsClient> | undefined;
const getSqsClient = (): ReturnType<typeof createSqsClient> => {
  cachedSqsClient ??= createSqsClient();
  return cachedSqsClient;
};

export { getSqsClient };
