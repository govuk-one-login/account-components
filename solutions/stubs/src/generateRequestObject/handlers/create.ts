import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import type { JwtHeader } from "../../types/common.js";
import {
  Algorithms,
  Channels,
  defaultEmailAddress,
  MockRequestObjectScenarios,
  Scope,
  Users,
} from "../../types/common.js";
import { getClientRegistryWithInvalidClient } from "../utils/getClientRegistryWithInvalidClient/index.js";
import { paths } from "../../utils/paths.js";
import assert from "node:assert";
import * as v from "valibot";
import type { JWTPayload } from "jose";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";
import { createHash } from "node:crypto";
import {
  amcRootDomain,
  checkUserAgentCookieName,
  rootDomain,
} from "../../../../commons/utils/constants.js";
import {
  getSplitTestBucketAssignmentsSchema,
  splitTestOverridesCookieName,
} from "../../../../commons/utils/fastify/splitTests/index.js";
import * as yaml from "yaml";

export const requestBodySchema = v.object({
  client_id: v.string(),
  algorithm: v.string(),
  scenario: v.string(),
  scope: v.string(),
  channel: v.string(),
  jti: v.string(),
  exp: v.string(),
  iss: v.string(),
  user: v.string(),
  state: v.string(),
  user_email_address: v.string(),
  account_management_api_authenticate_scenario: v.string(),
  account_management_api_deleteAccount_scenario: v.string(),
  account_management_api_sendOtpChallenge_scenario: v.string(),
  account_management_api_verifyOtpChallenge_scenario: v.string(),
  account_data_api_createPasskey_scenario: v.string(),
  account_data_api_getPasskeys_scenario: v.string(),
  stubs_account_interventions_service_api_access_token_getUserAisStatus_scenario:
    v.string(),
  split_test_bucket_assignments: v.string(),
});

export async function createRequestObjectGet(
  _: FastifyRequest,
  reply: FastifyReply,
  authorizeUrl?: string,
  jwtPayload?: JWTPayload,
  jwtHeader?: JwtHeader,
  originalRequestBody?: v.InferOutput<typeof requestBodySchema>,
) {
  const availableScopes = Object.values(Scope);
  const availableAlgorithms = Object.values(Algorithms);
  const availableScenarios = Object.values(MockRequestObjectScenarios);
  const availableClients = await getClientRegistryWithInvalidClient();
  const availableUsers = Object.values(Users);
  const availableChannels = Object.values(Channels);

  assert.ok(reply.render);
  await reply.render("generateRequestObject/handlers/create.njk", {
    availableScopes,
    availableAlgorithms,
    availableChannels,
    availableScenarios,
    availableClients,
    availableUsers,
    authorizeUrl,
    jwtPayload,
    jwtHeader,
    originalRequestBody,
    defaultEmailAddress,
    notifyDontSendEmailsTo: process.env["NOTIFY_DONT_SEND_EMAILS_TO"],
    isLocal: getEnvironment() === "local",
  });
  return reply;
}

export function createRequestObjectPost(fastify: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const requestBody = v.parse(requestBodySchema, request.body);

    const redirectUrl = (await getClientRegistryWithInvalidClient()).find(
      (client) => client.client_id === requestBody.client_id,
    )?.redirect_uris[0];
    assert.ok(redirectUrl);

    const response = await fastify.inject({
      method: "POST",
      url: paths.requestObjectGenerator,
      payload: new URLSearchParams({
        ...requestBody,
        redirect_uri: redirectUrl,
      }).toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    interface GenerateJARResponse {
      encryptedJar: string;
      jwtPayload: JWTPayload;
      jwtHeader: JwtHeader;
      token: string;
    }
    const { body } = response;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const result = JSON.parse(body) as GenerateJARResponse;

    assert.ok(process.env["AUTHORIZE_URL"], "AUTHORIZE_URL is not set");

    const url = new URL(process.env["AUTHORIZE_URL"]);
    url.searchParams.append("client_id", requestBody.client_id);
    url.searchParams.append("scope", requestBody.scope);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", redirectUrl);
    url.searchParams.append("request", result.encryptedJar);
    if (typeof result.jwtPayload["state"] === "string") {
      url.searchParams.append("state", result.jwtPayload["state"]);
    }

    assert.ok(rootDomain);
    assert.ok(amcRootDomain);

    reply.setCookie(
      checkUserAgentCookieName,
      createHash("sha256").update(result.token).digest("hex"),
      {
        secure: getEnvironment() !== "local",
        httpOnly: true,
        domain: rootDomain,
        sameSite: "strict",
        path: "/",
      },
    );

    const splitTestBucketAssignmentsSchema =
      await getSplitTestBucketAssignmentsSchema();

    const splitTestBucketAssignments = v.safeParse(
      v.pipe(
        v.string(),
        v.transform((splitTestBucketAssignmentsString) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          yaml.parse(splitTestBucketAssignmentsString),
        ),
        splitTestBucketAssignmentsSchema,
      ),
      requestBody.split_test_bucket_assignments,
    );

    if (splitTestBucketAssignments.success) {
      reply.setCookie(
        splitTestOverridesCookieName,
        JSON.stringify(splitTestBucketAssignments.output),
        {
          secure: getEnvironment() !== "local",
          httpOnly: true,
          domain: amcRootDomain,
          sameSite: "strict",
          path: "/",
        },
      );
    }

    await createRequestObjectGet(
      request,
      reply,
      url.toString(),
      result.jwtPayload,
      result.jwtHeader,
      requestBody,
    );
  };
}
