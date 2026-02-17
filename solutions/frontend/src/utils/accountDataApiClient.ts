import assert from "node:assert";
import { JsonApiClient } from "./jsonApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";
import * as v from "valibot";

const passkeyDetailsSchema = v.object({
  credential: v.string(),
  id: v.string(),
  aaguid: v.string(),
  isAttested: v.boolean(),
  signCount: v.number(),
  transports: v.array(v.string()),
  isBackUpEligible: v.boolean(),
  isBackedUp: v.boolean(),
  isResidentKey: v.boolean(),
});

export class AccountDataApiClient extends JsonApiClient {
  private readonly baseUrl: string;

  constructor(accessToken: string, event?: APIGatewayProxyEvent) {
    super("Account data API", event);

    assert(
      process.env["ACCOUNT_DATA_API_URL"],
      "ACCOUNT_DATA_API_URL is not set",
    );

    this.baseUrl = process.env["ACCOUNT_DATA_API_URL"];

    this.commonHeaders = {
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...this.commonHeaders,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async getPasskeys(publicSubjectId: string) {
    return this.logOnError("getPasskeys", async () => {
      try {
        const response = await fetch(
          `${this.baseUrl}/accounts/${publicSubjectId}/authenticators/passkeys`,
          {
            headers: this.commonHeaders,
          },
        );

        const errorsCodesMap = {
          // TODO add error codes once the spec has been updated to include numeric codes for each error - https://github.com/govuk-one-login/authentication-api/blob/8c15424012568dba52a456de364386d93869f974/ci/openAPI/AccountDataApi.yaml#L45
        } as const;

        return await AccountDataApiClient.processResponse(
          response,
          v.object({
            passkeys: v.array(
              v.object({
                ...passkeyDetailsSchema.entries,
                createdAt: v.pipe(
                  v.string(),
                  v.transform((input) => new Date(input)),
                ),
                lastUsedAt: v.pipe(
                  v.string(),
                  v.transform((input) => new Date(input)),
                ),
              }),
            ),
          }),
          errorsCodesMap,
        );
      } catch {
        return AccountDataApiClient.unknownError;
      }
    });
  }

  async createPasskey(
    publicSubjectId: string,
    passkeyDetails: v.InferOutput<typeof passkeyDetailsSchema>,
  ) {
    return this.logOnError("createPasskey", async () => {
      try {
        const response = await fetch(
          `${this.baseUrl}/accounts/${publicSubjectId}/authenticators/passkeys`,
          {
            method: "POST",
            headers: this.commonHeaders,
            body: JSON.stringify(passkeyDetails),
          },
        );

        const errorsCodesMap = {
          // TODO add error codes once the spec has been updated to include numeric codes for each error - https://github.com/govuk-one-login/authentication-api/blob/8c15424012568dba52a456de364386d93869f974/ci/openAPI/AccountDataApi.yaml#L45
        } as const;

        return await AccountDataApiClient.processResponse(
          response,
          AccountDataApiClient.undefinedSchema,
          errorsCodesMap,
        );
      } catch {
        return AccountDataApiClient.unknownError;
      }
    });
  }
}
