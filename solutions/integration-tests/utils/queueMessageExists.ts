import { getSqsClient } from "./sqsClient.js";

const MAX_ATTEMPTS = 30;

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
      VisibilityTimeout: 1,
      WaitTimeSeconds: 1,
    });

    const found = (response.Messages ?? []).some((message) => {
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const body = JSON.parse(message.Body ?? "") as MessageBody;
        return predicate(body);
      } catch {
        return false;
      }
    });

    if (found) return true;
  }

  throw new Error(
    `Message body matching predicate not found in ${queueUrl} after ${MAX_ATTEMPTS.toString()} attempts`,
  );
};
