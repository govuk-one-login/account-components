import assert from "node:assert";
import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";

export const verifyJti = async (jti: string | undefined) => {
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
    await dynamoDbClient.put({
      TableName: tableName,
      Item: {
        nonce: jti,
        expires:
          Math.floor(Date.now() / 1000) + appConfig.jti_nonce_ttl_in_seconds,
      },
      ConditionExpression: "attribute_not_exists(nonce)",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      errorManager.throwError("invalidRequest", `jti found: ${jti}`);
      return;
    }

    errorManager.throwError(
      "serverError",
      "Error checking replay attack table",
    );
    return;
  }
};
