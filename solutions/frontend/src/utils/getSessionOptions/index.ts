import type { FastifySessionOptions } from "@fastify/session";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";
import assert from "node:assert";
import ConnectDynamoDB from "connect-dynamodb";
import session from "express-session";
import { getDynamoDbClient } from "../../../../commons/utils/awsClients/dynamodbClient/index.js";
import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";

let dynamodbStore: ConnectDynamoDB.DynamoDBStore | undefined = undefined;

export const getSessionOptions = async (): Promise<FastifySessionOptions> => {
  assert.ok(process.env["SESSIONS_SIGNER"]);
  assert.ok(process.env["SESSIONS_TABLE_NAME"]);

  dynamodbStore ??= new (ConnectDynamoDB(session))({
    table: process.env["SESSIONS_TABLE_NAME"],
    client: getDynamoDbClient().client,
    specialKeys: [{ name: "user_id", type: ScalarAttributeType.S }],
    skipThrowMissingSpecialKeys: true,
  });

  return {
    secret: process.env["SESSIONS_SIGNER"],
    cookie: {
      secure: getEnvironment() !== "local",
      sameSite: "lax",
      maxAge: 3600000, // 1 hour in milliseconds
      httpOnly: true,
    },
    rolling: false,
    saveUninitialized: false,
    // @ts-expect-error
    store: dynamodbStore,
  };
};
