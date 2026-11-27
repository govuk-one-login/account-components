import { randomUUID } from "node:crypto";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";
const dynamoDbClient = getDynamoDbClient();

export const saveStubOutput = async (output: unknown) => {
  const now = Math.floor(Date.now() / 1000);

  await dynamoDbClient.put({
    TableName: process.env["STUBS_OUTPUTS_TABLE_NAME"],
    Item: {
      id: randomUUID(),
      allItemsId: "an_item",
      createdAt: now,
      expiresAt: now + 86400,
      output,
    },
  });
};
