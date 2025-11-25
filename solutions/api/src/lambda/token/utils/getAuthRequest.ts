import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";
import * as v from "valibot";

export const getAuthRequest = async (code: string) => {
  const dynamoDbClient = getDynamoDbClient();

  const AuthRequestSchema = v.object({
    code: v.string(),
    outcome_id: v.string(),
    client_id: v.string(),
    sub: v.string(),
    redirect_uri: v.pipe(v.string(), v.url()),
    scope: v.string(),
    expiry_time: v.number(),
  });

  const tableName = process.env["AUTH_TABLE_NAME"];
  if (!tableName) {
    throw new Error("AUTH_TABLE_NAME is not configured");
  }

  const { Item } = await dynamoDbClient.get({
    TableName: tableName,
    Key: { code },
  });

  if (!Item) {
    errorManager.throwError(
      "invalidCode",
      `Auth request not found for code: ${code}`,
    );
  }

  try {
    const parsedItem = v.parse(AuthRequestSchema, Item);
    return parsedItem;
  } catch {
    errorManager.throwError(
      "invalidCode",
      `Auth request data is invalid for code: ${code}`,
    );
  }

  return null;
};
