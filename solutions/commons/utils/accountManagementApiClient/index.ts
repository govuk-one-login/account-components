import assert from "node:assert";
import { JsonApiClient } from "../jsonApiClient/index.js";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { getUsefulPropsForLoggingFromEvent } from "../getUsefulPropsForLoggingFromEvent/index.js";

export class AccountManagementApiClient extends JsonApiClient {
  private readonly commonHeaders: NonNullable<RequestInit["headers"]>;

  constructor(accessToken: string, event?: APIGatewayProxyEvent) {
    assert(
      process.env["ACCOUNT_MANAGEMENT_API_URL"],
      "ACCOUNT_MANAGEMENT_API_URL is not set",
    );
    super(process.env["ACCOUNT_MANAGEMENT_API_URL"], "Account management API");

    const usefulPropsForLoggingFromEvent =
      getUsefulPropsForLoggingFromEvent(event);

    this.commonHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(usefulPropsForLoggingFromEvent.persistentSessionId
        ? {
            "di-persistent-session-id":
              usefulPropsForLoggingFromEvent.persistentSessionId,
          }
        : {}),
      ...(usefulPropsForLoggingFromEvent.sessionId
        ? { "session-id": usefulPropsForLoggingFromEvent.sessionId }
        : {}),
      ...(usefulPropsForLoggingFromEvent.clientSessionId
        ? {
            "client-session-id": usefulPropsForLoggingFromEvent.clientSessionId,
          }
        : {}),
      ...(usefulPropsForLoggingFromEvent.userLanguage
        ? { "user-language": usefulPropsForLoggingFromEvent.userLanguage }
        : {}),
      ...(usefulPropsForLoggingFromEvent.sourceIp
        ? { "x-forwarded-for": usefulPropsForLoggingFromEvent.sourceIp }
        : {}),
      ...(usefulPropsForLoggingFromEvent.txmaAuditEncoded
        ? {
            "txma-audit-encoded":
              usefulPropsForLoggingFromEvent.txmaAuditEncoded,
          }
        : {}),
    };
  }

  async sendOtpChallenge(emailAdress: string) {
    return this.logOnError("sendOtpChallenge", async () => {
      try {
        const response = await fetch(`${this.baseUrl}/send-otp-challenge`, {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify({
            email: emailAdress,
            mfaMethodType: "EMAIL",
          }),
        });

        const errorsCodesMap = {
          "1001": "RequestIsMissingParameters",
          "1092": "BlockedForEmailVerificationCodes",
          "1093": "TooManyEmailCodesEntered",
          "1079": "InvalidPrincipalInRequest",
          "1071": "AccountManagementApiUnexpectedError",
        } as const;

        return await AccountManagementApiClient.processResponse(
          response,
          AccountManagementApiClient.undefinedSchema,
          errorsCodesMap,
        );
      } catch {
        return AccountManagementApiClient.unknownError;
      }
    });
  }

  async verifyOtpChallenge(emailAdress: string, otp: string) {
    return this.logOnError("verifyOtpChallenge", async () => {
      try {
        const response = await fetch(`${this.baseUrl}/verify-otp-challenge`, {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify({
            email: emailAdress,
            mfaMethodType: "EMAIL",
            otp,
          }),
        });

        const errorsCodesMap = {
          "1001": "RequestIsMissingParameters",
          "1020": "InvalidOTPCode",
          "1093": "TooManyEmailCodesEntered",
        } as const;

        return await AccountManagementApiClient.processResponse(
          response,
          AccountManagementApiClient.undefinedSchema,
          errorsCodesMap,
        );
      } catch {
        return AccountManagementApiClient.unknownError;
      }
    });
  }
}
