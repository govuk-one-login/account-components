import type { FastifySessionOptions } from "@fastify/session";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";
import assert from "node:assert";
import ConnectDynamoDB from "connect-dynamodb";
import session from "express-session";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/index.js";
import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import { oneDayInSeconds } from "../../../../commons/utils/contstants.js";

export const getSessionOptions = (): FastifySessionOptions => {
  assert.ok(process.env["SESSIONS_SECRET"]);
  assert.ok(process.env["SESSIONS_TABLE_NAME"]);

  return {
    secret: process.env["SESSIONS_SECRET"],
    cookie: {
      secure: getEnvironment() !== "local",
      sameSite: "lax",
      maxAge: oneDayInSeconds * 1000, // TODO
      httpOnly: true,
    },
    rolling: false,
    // @ts-expect-error
    store: new (ConnectDynamoDB(session))({
      table: process.env["SESSIONS_TABLE_NAME"],
      client: getDynamoDbClient().docClient,
      specialKeys: [{ name: "user_id", type: ScalarAttributeType.S }],
      skipThrowMissingSpecialKeys: true,
    }),
  };
};
