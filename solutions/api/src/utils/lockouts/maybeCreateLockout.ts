import {
  oneYearInSeconds,
  type LockoutType,
  type Source,
} from "../../../../commons/utils/constants.js";
import * as v from "valibot";
import type { itemWithLockouts } from "../../../../commons/utils/schemas.js";
import { lockoutsDatabaseItem } from "../../../../commons/utils/schemas.js";
import { randomUUID } from "node:crypto";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";

type ItemSchemaBase = v.GenericSchema<v.InferOutput<typeof itemWithLockouts>>;
type Mode = "MostRecent" | "Consecutive" | "Any";
type ItemShouldContributeToLockout<ItemSchema extends ItemSchemaBase> = (
  item: v.InferOutput<ItemSchema>,
) => boolean;

const dynamoDbClient = getDynamoDbClient();

const queryAllItems = async ({
  tableName,
  publicSubjectIdGsiName,
  publicSubjectId,
  source,
  createdSince,
}: {
  tableName: string;
  publicSubjectIdGsiName: string;
  publicSubjectId: string;
  source: Source;
  createdSince: number;
}) => {
  const items: Record<string, AttributeValue>[] = [];
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;

  do {
    const response = await dynamoDbClient.query({
      TableName: tableName,
      IndexName: publicSubjectIdGsiName,
      KeyConditionExpression: "publicSubjectId = :publicSubjectId",
      FilterExpression: "source = :source AND createdAt > :createdSince",
      ExpressionAttributeValues: {
        ":publicSubjectId": publicSubjectId,
        ":source": source,
        ":createdSince": createdSince,
      },
      ConsistentRead: true,
      ScanIndexForward: false,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    items.push(...(response.Items ?? []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

const getLockoutContributingItems = <ItemSchema extends ItemSchemaBase>({
  mode,
  validatedItems,
  itemShouldContributeToLockout,
  itemCountForLockout,
}: {
  mode: Mode;
  validatedItems: v.InferOutput<ItemSchema>[];
  itemShouldContributeToLockout: ItemShouldContributeToLockout<ItemSchema>;
  itemCountForLockout: number;
}) => {
  let lockoutContributingItems: v.InferOutput<ItemSchema>[] = [];

  if (mode === "MostRecent") {
    lockoutContributingItems = validatedItems
      .slice(0, itemCountForLockout)
      .filter((item) => itemShouldContributeToLockout(item));
  } else if (mode === "Consecutive") {
    for (const item of validatedItems) {
      if (lockoutContributingItems.length === itemCountForLockout) {
        break;
      }
      if (itemShouldContributeToLockout(item)) {
        lockoutContributingItems.push(item);
      } else {
        lockoutContributingItems = [];
      }
    }
  } else {
    lockoutContributingItems = validatedItems
      .filter((item) => itemShouldContributeToLockout(item))
      .slice(0, itemCountForLockout);
  }

  return lockoutContributingItems;
};

export const maybeCreateLockout = async <ItemSchema extends ItemSchemaBase>({
  publicSubjectId,
  source,
  type,
  tableName,
  publicSubjectIdGsiName,
  itemSchema,
  itemShouldContributeToLockout,
  itemCountForLockout = 6,
  window = 10800,
  duration = 900,
  mode = "MostRecent",
}: {
  publicSubjectId: string;
  source: Source;
  type: LockoutType;
  tableName: string;
  publicSubjectIdGsiName: string;
  itemSchema: ItemSchema;
  itemShouldContributeToLockout: ItemShouldContributeToLockout<ItemSchema>;
  itemCountForLockout?: number;
  window?: number;
  duration?: number;
  mode?: Mode;
}) => {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  const allItems = await queryAllItems({
    tableName,
    publicSubjectIdGsiName,
    publicSubjectId,
    source,
    createdSince: nowInSeconds - window,
  });

  if (allItems.length < itemCountForLockout) return;

  const validatedItems = v.parse(v.array(itemSchema), allItems);
  const lockoutContributingItems = getLockoutContributingItems({
    mode,
    validatedItems,
    itemShouldContributeToLockout,
    itemCountForLockout,
  });

  if (lockoutContributingItems.length < itemCountForLockout) {
    return;
  }

  const lockout = v.parse(lockoutsDatabaseItem, {
    id: randomUUID(),
    publicSubjectId,
    lockedOutAt: nowInSeconds,
    lockedOutUntil: nowInSeconds + duration,
    source,
    type,
    keepUntil: nowInSeconds + oneYearInSeconds,
  });

  await dynamoDbClient.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: process.env["LOCKOUTS_TABLE_NAME"],
          Item: lockout,
          ConditionExpression: "attribute_not_exists(id)",
        },
      },
      ...lockoutContributingItems.map((item) => ({
        Put: {
          TableName: tableName,
          Item: v.parse(itemSchema, {
            ...item,
            lockouts: [
              ...(item.lockouts ?? []),
              {
                type: type,
                id: lockout.id,
              },
            ],
          }),
          ConditionExpression: "attribute_exists(id)",
        },
      })),
    ],
  });

  return {
    ...lockout,
    lockedOutAt: new Date(lockout.lockedOutAt * 1000),
    lockedOutUntil: new Date(lockout.lockedOutUntil * 1000),
  };
};
