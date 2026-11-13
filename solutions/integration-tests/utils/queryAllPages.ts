import type { QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { getDynamoDbClient } from "./dynamodbClient.js";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";

const dynamoDbClient = getDynamoDbClient();

type Item = Record<string, AttributeValue>;

export const queryAllPages = async (
  queryParams: Omit<QueryCommandInput, "ExclusiveStartKey">,
) => {
  const items: Item[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastEvaluatedKey: Record<string, any> | undefined = undefined;

  do {
    const response = await dynamoDbClient.query({
      ...queryParams,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    items.push(...(response.Items ?? []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};
