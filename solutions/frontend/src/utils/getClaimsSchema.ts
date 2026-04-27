import * as v from "valibot";
import { logger } from "../../../commons/utils/logger/index.js";
import assert from "node:assert";
import type { ClientEntry } from "../../../config/schema/types.js";
import { Scope } from "../../../commons/utils/commonTypes.js";

export const getClaimsSchema = (
  callback: (dimension: string) => void,
  client: ClientEntry,
  redirectUri: string,
  scope: string,
  state?: string,
) => {
  assert.ok(
    process.env["AUTHORIZE_ENDPOINT_URL"],
    "AUTHORIZE_ENDPOINT_URL is not set",
  );

  const expectedResponseType = "code";

  const validClientScopes = client.scope.split(" ").filter((scope) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return Object.values(Scope).includes(scope as Scope);
  });

  const claimsSchema = v.object({
    client_id: v.literal(client.client_id, (issue) => {
      logger.warn("Client ID discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      callback("ClientIdDiscrepancy");
      return "";
    }),
    iss: v.literal(client.client_id, (issue) => {
      logger.warn("Issuer discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      callback("IssuerDiscrepancy");
      return "";
    }),
    aud: v.literal(process.env["AUTHORIZE_ENDPOINT_URL"], (issue) => {
      logger.warn("Unexpected Audience", {
        client_id: client.client_id,
        expected_aud: process.env["AUTHORIZE_ENDPOINT_URL"],
        received_aud: issue.received,
      });
      callback("UnexpectedAudience");
      return "";
    }),
    response_type: v.literal(expectedResponseType, (issue) => {
      logger.warn("Unexpected Response Type", {
        client_id: client.client_id,
        expected_response_type: expectedResponseType,
        received_response_type: issue.received,
      });
      callback("UnexpectedResponseType");
      return "";
    }),
    exp: v.number(),
    iat: v.pipe(
      v.number(),
      v.maxValue(Math.floor(Date.now() / 1000), (issue) => {
        logger.warn("iat is in the future", {
          client_id: client.client_id,
          iat: new Date(Number(issue.received) * 1000).toISOString(),
          current_datetime: new Date().toISOString(),
        });
        callback("IATInTheFuture");
        return "";
      }),
    ),
    redirect_uri: v.literal(redirectUri),
    scope: v.pipe(
      v.literal(scope),
      v.picklist(validClientScopes, (issue) => {
        logger.warn("Scope Denied", {
          client_id: client.client_id,
          all_valid_scopes: Object.values(Scope),
          client_scopes: client.scope,
          valid_client_scopes: validClientScopes,
          received_scope: issue.received,
        });
        callback("ScopeDenied");
        return "";
      }),
      v.enum(Scope),
    ),
    state: state === undefined ? v.undefined() : v.literal(state),
    jti: v.pipe(v.string(), v.nonEmpty()),
    account_management_api_access_token: v.optional(
      v.pipe(v.string(), v.nonEmpty()),
    ),
    account_data_api_access_token: v.optional(v.pipe(v.string(), v.nonEmpty())),
    sub: v.pipe(v.string(), v.nonEmpty()),
    public_sub: v.pipe(v.string(), v.nonEmpty()),
    email: v.pipe(v.string(), v.email()),
    channel: v.optional(
      v.picklist(["web", "strategic_app", "generic_app"]),
      "web",
    ),
  });

  return claimsSchema;
};

export type Claims = v.InferOutput<ReturnType<typeof getClaimsSchema>>;
