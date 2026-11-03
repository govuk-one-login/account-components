import type {
  LockoutType,
  Source,
} from "../../../../commons/utils/constants.js";
import * as v from "valibot";
import { lockoutsDatabaseItem } from "../../../../commons/utils/schemas.js";
import { randomUUID } from "node:crypto";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";

const dynamoDbClient = getDynamoDbClient();

export const createLockout = async ({
  publicSubjectId,
  source,
  type,
  lockedOutUntil,
}: {
  publicSubjectId: string;
  source: Source;
  type: LockoutType;
  lockedOutUntil: Date;
}) => {
  const lockout = v.parse(lockoutsDatabaseItem, {
    id: randomUUID(),
    publicSubjectId,
    lockedOutAt: Math.floor(Date.now() / 1000),
    lockedOutUntil: Math.floor(lockedOutUntil.getTime() / 1000),
    source,
    type,
  });

  await dynamoDbClient.put({
    TableName: process.env["LOCKOUTS_TABLE_NAME"],
    Item: lockout,
    ConditionExpression: "attribute_not_exists(id)",
  });

  return {
    ...lockout,
    lockedOutAt: new Date(lockout.lockedOutAt * 1000),
    lockedOutUntil: new Date(lockout.lockedOutUntil * 1000),
  };
};
