import { getSqsClient } from "./sqsClient.js";

const MAX_ATTEMPTS = 15;

const sqsClient = getSqsClient();

type MessageBody = Record<string, unknown>;

export const queueMessageExists = async (
  queueUrl: string,
  predicate: (messageBody: MessageBody) => boolean,
): Promise<true> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await sqsClient.receiveMessage({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 3,
      WaitTimeSeconds: 1,
    });

    const match = (response.Messages ?? []).find((message) => {
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const body = JSON.parse(message.Body ?? "") as MessageBody;
        return predicate(body);
      } catch {
        return false;
      }
    });

    if (match) return true;
  }

  throw new Error(
    `Message body matching predicate not found in ${queueUrl} after ${MAX_ATTEMPTS.toString()} attempts`,
  );
};
