import assert from "node:assert";
import { JsonApiClient } from "./jsonApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

import * as v from "valibot";

const AccountStateSchema = v.object({
  blocked: v.boolean(),
  suspended: v.boolean(),
  reproveIdentity: v.boolean(),
  resetPassword: v.boolean(),
});

const InterventionStatusResponseSchema = v.object({
  state: AccountStateSchema,
});

export class AccountInterventionsServiceApiClient extends JsonApiClient {
  private readonly baseUrl: string;
  private readonly commonHeaders: NonNullable<RequestInit["headers"]>;

  /*
    Access token is optional because the real AIS API doesn't need an
    access token, but the stub AIS API requires one to determine which
    canned response to return.
  */
  constructor(accessToken?: string, event?: APIGatewayProxyEvent) {
    super("Account interventions service API", event);

    assert(
      process.env["ACCOUNT_INTERVENTIONS_SERVICE_API_URL"],
      "ACCOUNT_INTERVENTIONS_SERVICE_API_URL is not set",
    );

    this.baseUrl = process.env["ACCOUNT_INTERVENTIONS_SERVICE_API_URL"];

    this.commonHeaders = {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };
  }

  async getUserAisStatus(commonSubjectId: string) {
    return this.logOnError("Get user account intervention status", async () => {
      try {
        const response = await this.fetch(
          `${this.baseUrl}/ais/${commonSubjectId}`,
          {
            headers: this.commonHeaders,
          },
        );

        const errorsCodesMap = {} as const;

        return await AccountInterventionsServiceApiClient.processResponse(
          response,
          InterventionStatusResponseSchema,
          errorsCodesMap,
        );
      } catch (error) {
        return {
          ...AccountInterventionsServiceApiClient.unknownError,
          errorDetails: error,
        };
      }
    });
  }
}
