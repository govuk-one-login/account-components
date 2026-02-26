import assert from "node:assert";
import { JsonApiClient } from "./jsonApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";
import * as v from "valibot";
import { passkeyDetailsSchema } from "../../../commons/utils/constants.js";

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
          "5000": "invalid_request_body",
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
          "4000": "invalid_request_body",
          "4001": "missing_required_fields",
          "4090": "passkey_already_exists",
          "4220": "invalid_credential_format",
          "4221": "invalid_aaguid_format",
          "4222": "invalid_attestation_signature",
          "5000": "invalid_request_body",
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
