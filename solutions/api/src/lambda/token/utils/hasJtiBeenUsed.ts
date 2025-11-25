import assert from "node:assert";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";

export const hasJtiBeenUsed = async (jti: string): Promise<boolean> => {
  const dynamoDbClient = getDynamoDbClient();
  assert.ok(
    process.env["REPLAY_ATTACK_TABLE_NAME"],
    "REPLAY_ATTACK_TABLE_NAME not set",
  );
  const tableName = process.env["REPLAY_ATTACK_TABLE_NAME"];

  try {
    const { Item } = await dynamoDbClient.get({
      TableName: tableName,
      Key: { nonce: jti },
    });
    return !!Item;
  } catch {
    errorManager.throwError(
      "serverError",
      "Error checking replay attack table",
    );
  }

  return true;
};
