import assert from "node:assert";
import * as v from "valibot";
import { logger } from "../logger/index.js";
export class AccountManagementApiClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private static readonly unknownError = {
    success: false,
    error: "UnknownError",
  } as const;

  constructor(accessToken: string) {
    assert(
      process.env["ACCOUNT_MANAGEMENT_API_URL"],
      "ACCOUNT_MANAGEMENT_API_URL is not set",
    );
    this.baseUrl = process.env["ACCOUNT_MANAGEMENT_API_URL"];
    this.accessToken = accessToken;
  }

  private static async processResponse<
    TSuccess,
    const TErrorMap extends Record<string, string>,
  >(
    response: Response,
    successResponseBodySchema: v.GenericSchema<unknown, TSuccess>,
    errorCodesMap: TErrorMap,
  ): Promise<
    | {
        readonly success: true;
        readonly result: TSuccess;
      }
    | {
        readonly success: false;
        readonly error:
          | TErrorMap[keyof TErrorMap]
          | "ErrorParsingResponseBody"
          | "UnknownErrorResponse";
      }
  > {
    if (response.ok) {
      const body = v.safeParse(
        successResponseBodySchema,
        await response.json(),
      );
      if (!body.success) {
        return {
          success: false,
          error: "ErrorParsingResponseBody",
        };
      }
      return {
        success: true,
        result: body.output,
      };
    }

    const errorResponseBodySchema = v.object({
      code: v.number(),
      message: v.string(),
    });

    const body = v.safeParse(errorResponseBodySchema, await response.json());

    if (!body.success) {
      return {
        success: false,
        error: "ErrorParsingResponseBody",
      };
    }

    if (!Object.keys(errorCodesMap).includes(body.output.code.toString())) {
      return {
        success: false,
        error: "UnknownErrorResponse",
      };
    }

    return {
      success: false,
      error:
        errorCodesMap[
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          body.output.code as unknown as keyof TErrorMap
        ],
    };
  }

  async sendOtpChallenge(emailAdress: string) {
    try {
      const response = await fetch(`${this.baseUrl}/send-otp-challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
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
        v.unknown(),
        errorsCodesMap,
      );
    } catch (e) {
      logger.error({ error: e, message: "Error sending OTP challenge" });
      return AccountManagementApiClient.unknownError;
    }
  }

  async verifyOtpChallenge(emailAdress: string, otp: string) {
    try {
      const response = await fetch(`${this.baseUrl}/verify-otp-challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
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
        v.unknown(),
        errorsCodesMap,
      );
    } catch (e) {
      logger.error({ error: e, message: "Error sending OTP challenge" });
      return AccountManagementApiClient.unknownError;
    }
  }
}
