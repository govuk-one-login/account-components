import assert from "node:assert";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";

export const verifyJti = async (jti: string | undefined) => {
  let item;

  const appConfig = await getAppConfig();
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
      ConsistentRead: true,
    }));
  } catch {
    errorManager.throwError(
      "serverError",
      "Error checking replay attack table",
    );
    return;
  }

  if (item) {
    errorManager.throwError("invalidRequest", `jti found: ${jti}`);
    return;
  }

  await dynamoDbClient.put({
    TableName: tableName,
    Item: {
      nonce: jti,
      expires:
        Math.floor(Date.now() / 1000) + appConfig.jti_nonce_ttl_in_seconds,
    },
  });
};
