import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";
import * as v from "valibot";

export const getAuthRequest = async (
  code: string,
  assertion_redirect_uri: string | undefined,
) => {
  if (!assertion_redirect_uri) {
    return errorManager.throwError(
      "invalidCode",
      "Client assertion is missing redirect_uri",
    );
  }

  const dynamoDbClient = getDynamoDbClient();

  const AuthRequestSchema = v.object({
    code: v.string(),
    outcome_id: v.string(),
    client_id: v.string(),
    sub: v.string(),
    redirect_uri: v.pipe(
      v.string(),
      v.url(),
      v.literal(assertion_redirect_uri, (issue) => {
        return `auth request redirect=${String(issue.input)}, client assertion redirect=${assertion_redirect_uri}`;
      }),
    ),
    expires: v.pipe(
      v.number(),
      v.minValue(Date.now() / 1000, "Auth request has expired"),
    ),
  });

  const tableName = process.env["AUTH_TABLE_NAME"];
  if (!tableName) {
    throw new Error("AUTH_TABLE_NAME is not configured");
  }

  const { Item } = await dynamoDbClient.get({
    TableName: tableName,
    Key: { code },
    ConsistentRead: true,
  });

  if (!Item) {
    return errorManager.throwError(
      "invalidCode",
      `Auth request not found for code: ${code}`,
    );
  }

  try {
    const parsedItem = v.parse(AuthRequestSchema, Item);
    return parsedItem;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return errorManager.throwError(
      "invalidCode",
      `Auth request data is invalid for code: ${code}, ${errorMessage}`,
    );
  }
};
