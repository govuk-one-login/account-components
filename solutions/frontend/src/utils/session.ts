import type { FastifySessionOptions } from "@fastify/session";
import { getEnvironment } from "../../../commons/utils/getEnvironment/index.js";
import assert from "node:assert";
import type { FastifyRequest } from "fastify";
import { DynamoDbSessionStore } from "./dynamoDbSessionStore.js";
import { rootCookieDomain } from "./constants.js";

export const destroySession = async (request: FastifyRequest) => {
  await request.session.regenerate();
  // There is no need to manually unset the session cookie here
  // calling request.session.regenerate does it for us
};

export const getSessionOptions = async (): Promise<FastifySessionOptions> => {
  assert.ok(process.env["SESSIONS_SIGNER"]);
  assert.ok(process.env["SESSIONS_TABLE_NAME"]);
  assert.ok(rootCookieDomain);

  return {
    secret: process.env["SESSIONS_SIGNER"],
    // Purposely no maxAge or expires as we want it to be a session cookie
    cookie: {
      secure: getEnvironment() !== "local",
      sameSite: "strict",
      httpOnly: true,
      // Scoped to the root cookie domain to allow it to be deleted on logout in the account management frontend
      domain: rootCookieDomain,
    },
    cookieName: "amc_sess",
    rolling: false,
    saveUninitialized: false,
    store: new DynamoDbSessionStore(process.env["SESSIONS_TABLE_NAME"]),
  };
};
