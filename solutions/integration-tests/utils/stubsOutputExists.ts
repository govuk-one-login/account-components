import { getDynamoDbClient } from "./dynamodbClient.js";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = "amc-StubsOutputsTable";
const INDEX_NAME = "AllItemsIndex";
const POLL_INTERVAL_MS = 1000;
const MAX_ATTEMPTS = 15;

const dynamoDbClient = getDynamoDbClient();

type Item = Record<string, AttributeValue>;

export const stubsOutputExists = async (
  predicate: (item: Item) => boolean,
): Promise<true> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const items: Item[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const response = await dynamoDbClient.query({
        TableName: TABLE_NAME,
        IndexName: INDEX_NAME,
        KeyConditionExpression: "allItemsId = an_item",
        ScanIndexForward: false,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      items.push(...(response.Items ?? []));
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const match = items.find((item) => predicate(item));
    if (match) return true;

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error(
    `Item matching predicate not found in ${TABLE_NAME}/${INDEX_NAME} after ${MAX_ATTEMPTS.toString()} attempts`,
  );
};
