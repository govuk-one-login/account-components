import type { FastifySessionOptions } from "@fastify/session";
import { getEnvironment } from "../../../commons/utils/getEnvironment/index.js";
import assert from "node:assert";
import ConnectDynamoDB from "connect-dynamodb";
import session from "express-session";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";
import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import type { FastifyRequest } from "fastify";

export const sessionCookieName = "session";
export const sessionPrefix = "sess:";

export const destroySession = async (request: FastifyRequest) => {
  await request.session.regenerate();
  // There is no need to manually unset the session cookie here
  // calling request.session.regenerate does it for us
};

let dynamodbStore: ConnectDynamoDB.DynamoDBStore | undefined = undefined;

export const getSessionOptions = async (): Promise<FastifySessionOptions> => {
  assert.ok(process.env["SESSIONS_SIGNER"]);
  assert.ok(process.env["SESSIONS_TABLE_NAME"]);

  dynamodbStore ??= new (ConnectDynamoDB(session))({
    table: process.env["SESSIONS_TABLE_NAME"],
    client: getDynamoDbClient().client,
    specialKeys: [{ name: "user_id", type: ScalarAttributeType.S }],
    skipThrowMissingSpecialKeys: true,
    prefix: sessionPrefix,
  });

  return {
    secret: process.env["SESSIONS_SIGNER"],
    cookieName: sessionCookieName,
    cookie: {
      secure: getEnvironment() !== "local",
      sameSite: "lax",
      httpOnly: true,
    },
    rolling: false,
    saveUninitialized: false,
    // @ts-expect-error
    store: dynamodbStore,
  };
};
