import type { LockoutType, Source } from "../../../commons/utils/constants.js";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";
import type { QueryOutput } from "@aws-sdk/client-dynamodb";
import { lockoutsDatabaseItem } from "../../../commons/utils/schemas.js";
import * as v from "valibot";

const dynamodbClient = getDynamoDbClient();

export const getLockouts = async ({
  publicSubjectId,
  source,
  type,
}: {
  publicSubjectId: string;
  source: Source;
  type?: LockoutType;
}) => {
  const now = Math.floor(Date.now() / 1000);

  const items: NonNullable<QueryOutput["Items"]> = [];
  let lastEvaluatedKey: QueryOutput["LastEvaluatedKey"] = undefined;

  do {
    const response = await dynamodbClient.query({
      TableName: process.env["LOCKOUTS_TABLE_NAME"],
      IndexName: process.env["LOCKOUTS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
      KeyConditionExpression: "publicSubjectId = :publicSubjectId",
      FilterExpression: `lockedOutUntil > :now AND source = :source${
        type !== undefined ? " AND type = :type" : ""
      }`,
      ExpressionAttributeValues: {
        ":publicSubjectId": publicSubjectId,
        ":now": now,
        ":source": source,
        ...(type !== undefined ? { ":type": type } : {}),
      },
      ScanIndexForward: false,
      ExclusiveStartKey: lastEvaluatedKey,
      ConsistentRead: true,
    });

    items.push(...(response.Items ?? []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  const lockouts = v.parse(v.array(lockoutsDatabaseItem), items);

  return lockouts;
};
