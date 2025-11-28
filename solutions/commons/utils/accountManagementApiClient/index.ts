import assert from "node:assert";
import * as v from "valibot";

export class AccountManagementApiClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;

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
        success: true;
        result: TSuccess;
      }
    | {
        success: false;
        error:
          | TErrorMap[keyof TErrorMap]
          | "ErrorParsingResponseBody"
          | "UnknownError";
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
        error: "UnknownError",
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

    return AccountManagementApiClient.processResponse(
      response,
      v.unknown(),
      errorsCodesMap,
    );
  }

  async verifyOtpChallenge(emailAdress: string, otp: string) {
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

    return AccountManagementApiClient.processResponse(
      response,
      v.unknown(),
      errorsCodesMap,
    );
  }
}
