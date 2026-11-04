import type {
  LockoutType,
  Source,
} from "../../../../commons/utils/constants.js";
import * as v from "valibot";
import type { itemWithLockouts } from "../../../../commons/utils/schemas.js";
import { lockoutsDatabaseItem } from "../../../../commons/utils/schemas.js";
import { randomUUID } from "node:crypto";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";

const dynamoDbClient = getDynamoDbClient();

/*
TODO
what about multiple lockout types per action?
is that now solved?
yes by storing id and type of lockouts and allow decision to be made in itemShouldContributeToLockout

no defaults on endpoints for lockoutDuration, maxAllowedBeforeLockout in endpoints

will need to update existing tickets
need to update Word doc?
*/

export const maybeCreateLockout = async <
  ItemSchema extends v.GenericSchema<v.InferOutput<typeof itemWithLockouts>>,
>({
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
  itemShouldContributeToLockout: (item: v.InferOutput<ItemSchema>) => boolean;
  itemCountForLockout?: number;
  window?: number;
  duration?: number;
  mode?: "MostRecent" | "Consecutive" | "Any";
}) => {
  const items = await dynamoDbClient.query({
    TableName: tableName,
    IndexName: publicSubjectIdGsiName,
    KeyConditionExpression: "publicSubjectId = :publicSubjectId",
    FilterExpression: "source = :source",
    ExpressionAttributeValues: {
      ":publicSubjectId": publicSubjectId,
      ":source": source,
    },
    ConsistentRead: true,
    ScanIndexForward: false,
  });

  if (!items.Items || items.Items.length < itemCountForLockout) return;

  const validatedItems = v.parse(v.array(itemSchema), items.Items ?? []);

  const nowInSeconds = Math.floor(Date.now() / 1000);

  const itemCreatedInWindow = (item: v.InferOutput<ItemSchema>) => {
    return item.createdAt > nowInSeconds - window;
  };

  let lockoutContributingItems: v.InferOutput<ItemSchema>[] = [];

  if (mode === "MostRecent") {
    lockoutContributingItems = validatedItems
      .slice(0, itemCountForLockout)
      .filter((item) => {
        return itemCreatedInWindow(item) && itemShouldContributeToLockout(item);
      });
  } else if (mode === "Consecutive") {
    for (const item of validatedItems) {
      if (
        lockoutContributingItems.length === itemCountForLockout ||
        !itemCreatedInWindow(item)
      ) {
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
      .filter((item) => {
        return itemCreatedInWindow(item) && itemShouldContributeToLockout(item);
      })
      .slice(0, itemCountForLockout);
  }

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
