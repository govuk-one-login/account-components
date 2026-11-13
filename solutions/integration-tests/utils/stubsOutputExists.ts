import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { queryAllPages } from "./queryAllPages.js";

const TABLE_NAME = "amc-StubsOutputsTable";
const INDEX_NAME = "AllItemsIndex";
const POLL_INTERVAL_MS = 1000;
const MAX_ATTEMPTS = 15;

export const stubsOutputExists = async (
  predicate: (output: AttributeValue) => boolean,
): Promise<true> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const items = await queryAllPages({
      TableName: TABLE_NAME,
      IndexName: INDEX_NAME,
      KeyConditionExpression: "allItemsId = an_item",
      ScanIndexForward: false,
    });

    const match = items.find((item) => {
      if (item["output"] === undefined) return false;
      try {
        return predicate(item["output"]);
      } catch {
        return false;
      }
    });
    if (match) return true;

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error(
    `Item with output matching predicate not found in ${TABLE_NAME}/${INDEX_NAME} after ${MAX_ATTEMPTS.toString()} attempts`,
  );
};
