import fastifySession from "@fastify/session";
import fastifyHelmet from "@fastify/helmet";
import fastifyCsrfProtection from "@fastify/csrf-protection";
import fastifyFormBody from "@fastify/formbody";
import { getEnvironment } from "../../utils/getEnvironment/index.js";
import type { FastifyTypeboxInstance } from "../../app.js";
import { journeys } from "./journeys/index.js";
import assert from "node:assert";
import ConnectDynamoDB from "connect-dynamodb";
import session from "express-session";
import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import { getDynamoDbClient } from "../../utils/awsClient/index.js";

export const frontend = function (app: FastifyTypeboxInstance) {
  app.register(fastifyFormBody);
  app.register(fastifyHelmet);

  assert(process.env["SESSIONS_SECRET"]);
  assert(process.env["SESSIONS_TABLE_NAME"]);

  // @ts-expect-error - TODO
  app.register(fastifySession, {
    saveUninitialized: false,
    secret: process.env["SESSIONS_SECRET"],
    rolling: false,
    store: new (ConnectDynamoDB(session))({
      table: process.env["SESSIONS_TABLE_NAME"],
      client: getDynamoDbClient().docClient,
      specialKeys: [{ name: "user_id", type: ScalarAttributeType.S }],
      skipThrowMissingSpecialKeys: true,
      // TODO prefix needed?
    }),
    cookie: {
      secure: getEnvironment() !== "local",
      sameSite: "lax",
      maxAge: 1000000, // TODO
    },
  });

  app.register(fastifyCsrfProtection, {
    sessionPlugin: "@fastify/session",
  });

  app.register(journeys);
};
