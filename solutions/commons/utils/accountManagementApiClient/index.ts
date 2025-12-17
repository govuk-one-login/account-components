import assert from "node:assert";
import { JsonApiClient } from "../jsonApiClient/index.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

export class AccountManagementApiClient extends JsonApiClient {
  private readonly baseUrl: string;

  constructor(accessToken: string, event?: APIGatewayProxyEvent) {
    super("Account management API", event);

    assert(
      process.env["ACCOUNT_MANAGEMENT_API_URL"],
      "ACCOUNT_MANAGEMENT_API_URL is not set",
    );

    this.baseUrl = process.env["ACCOUNT_MANAGEMENT_API_URL"];

    this.commonHeaders = {
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...this.commonHeaders,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async authenticate(emailAddress: string, password: string) {
    return this.logOnError("authenticate", async () => {
      try {
        const response = await fetch(`${this.baseUrl}/authenticate`, {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify({
            email: emailAddress,
            password,
          }),
        });

        const errorsCodesMap = {
          "1001": "RequestIsMissingParameters",
          "1010": "AccountDoesNotExist",
          "1008": "InvalidLoginCredentials",
          "1084": "UserAccountBlocked",
          "1083": "UserAccountSuspended",
          "1085": "AccountInterventionsUnexpectedError",
          "1094": "ExceededIncorrectPasswordSubmissionLimit",
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

  async deleteAccount(emailAddress: string) {
    return this.logOnError("deleteAccount", async () => {
      try {
        const response = await fetch(`${this.baseUrl}/delete-account`, {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify({
            email: emailAddress,
          }),
        });

        const errorsCodesMap = {
          "1001": "RequestIsMissingParameters",
          "1010": "AccountDoesNotExist",
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

  async sendOtpChallenge(publicSubjectId: string) {
    return this.logOnError("sendOtpChallenge", async () => {
      try {
        const response = await fetch(
          `${this.baseUrl}/send-otp-challenge/${publicSubjectId}`,
          {
            method: "POST",
            headers: this.commonHeaders,
            body: JSON.stringify({
              mfaMethodType: "EMAIL",
            }),
          },
        );

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

  async verifyOtpChallenge(publicSubjectId: string, otp: string) {
    return this.logOnError("verifyOtpChallenge", async () => {
      try {
        const response = await fetch(
          `${this.baseUrl}/verify-otp-challenge/${publicSubjectId}`,
          {
            method: "POST",
            headers: this.commonHeaders,
            body: JSON.stringify({
              otp,
              mfaMethodType: "EMAIL",
            }),
          },
        );

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
