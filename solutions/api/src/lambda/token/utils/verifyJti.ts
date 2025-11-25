import assert from "node:assert";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";

export const verifyJti = async (jti: string | undefined) => {
  let item;
  const dynamoDbClient = getDynamoDbClient();
  assert.ok(
    process.env["REPLAY_ATTACK_TABLE_NAME"],
    "REPLAY_ATTACK_TABLE_NAME not set",
  );
  const tableName = process.env["REPLAY_ATTACK_TABLE_NAME"];

  if (!jti) {
    errorManager.throwError("invalidRequest", "jti is missing");
    return;
  }

  try {
    ({ Item: item } = await dynamoDbClient.get({
      TableName: tableName,
      Key: { nonce: jti },
    }));
  } catch {
    errorManager.throwError(
      "serverError",
      "Error checking replay attack table",
    );
  }

  if (!item) {
    errorManager.throwError("invalidRequest", `jti not found: ${jti}`);
  }
};
