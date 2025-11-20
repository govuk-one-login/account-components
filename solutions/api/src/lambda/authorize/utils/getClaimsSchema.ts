import * as v from "valibot";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import assert from "node:assert";
import type { ClientEntry } from "../../../../../config/schema/types.js";

export enum Scope {
  accountDelete = "account-delete",
}

export const getClaimsSchema = (
  client: ClientEntry,
  redirectUri: string,
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
      metrics.addMetric("ClientIdDiscrepancy", MetricUnit.Count, 1);
      return "";
    }),
    iss: v.literal(client.client_id, (issue) => {
      logger.warn("Issuer discrepancy", {
        client_id: client.client_id,
        expected_client_id: client.client_id,
        received_client_id: issue.received,
      });
      metrics.addMetric("IssuerDiscrepancy", MetricUnit.Count, 1);
      return "";
    }),
    aud: v.literal(process.env["AUTHORIZE_ENDPOINT_URL"], (issue) => {
      logger.warn("Unexpected Audience", {
        client_id: client.client_id,
        expected_aud: process.env["AUTHORIZE_ENDPOINT_URL"],
        received_aud: issue.received,
      });
      metrics.addMetric("UnexpectedAudience", MetricUnit.Count, 1);
      return "";
    }),
    response_type: v.literal(expectedResponseType, (issue) => {
      logger.warn("Unexpected Response Type", {
        client_id: client.client_id,
        expected_response_type: expectedResponseType,
        received_response_type: issue.received,
      });
      metrics.addMetric("UnexpectedResponseType", MetricUnit.Count, 1);
      return "";
    }),
    exp: v.number(),
    iat: v.pipe(
      v.number(),
      v.maxValue(Date.now() / 1000, (issue) => {
        logger.warn("iat is in the future", {
          client_id: client.client_id,
          iat: new Date(Number(issue.received) * 1000).toISOString(),
          current_datetime: new Date().toISOString(),
        });
        metrics.addMetric("IATInTheFuture", MetricUnit.Count, 1);
        return "";
      }),
    ),
    redirect_uri: v.literal(redirectUri),
    scope: v.pipe(
      v.picklist(validClientScopes, (issue) => {
        logger.warn("Scope Denied", {
          client_id: client.client_id,
          all_valid_scopes: Object.values(Scope),
          client_scopes: client.scope,
          valid_client_scopes: validClientScopes,
          received_scope: issue.received,
        });
        metrics.addMetric("ScopeDenied", MetricUnit.Count, 1);
        return "";
      }),
      v.enum(Scope),
    ),
    state: state === undefined ? v.undefined() : v.literal(state),
    jti: v.pipe(v.string(), v.nonEmpty()),
    access_token: v.pipe(v.string(), v.nonEmpty()),
    refresh_token: v.nullish(v.pipe(v.string(), v.nonEmpty())),
    sub: v.pipe(v.string(), v.nonEmpty()),
    email: v.pipe(v.string(), v.email()),
    govuk_signin_journey_id: v.pipe(v.string(), v.nonEmpty()),
  });

  return claimsSchema;
};
