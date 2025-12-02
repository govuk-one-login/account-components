import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";
import * as v from "valibot";

export const getAuthRequest = async (
  code: string,
  redirect_uri: string,
  client_id: string,
) => {
  const dynamoDbClient = getDynamoDbClient();

  const AuthRequestSchema = v.object({
    code: v.string(),
    outcome_id: v.string(),
    client_id: v.pipe(
      v.string(),
      v.literal(client_id, (issue) => {
        return `auth client_id=${String(issue.input)}, assertion client_id=${client_id}`;
      }),
    ),
    sub: v.string(),
    redirect_uri: v.pipe(
      v.string(),
      v.url(),
      v.literal(redirect_uri, (issue) => {
        return `auth redirect=${String(issue.input)}, request redirect=${redirect_uri}`;
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

export type AuthRequestT = Awaited<ReturnType<typeof getAuthRequest>>;
