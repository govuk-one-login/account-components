import assert from "node:assert";
import { JsonApiClient } from "./jsonApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";
import * as v from "valibot";
import type { Source } from "../../../commons/utils/constants.js";
import { LockoutType } from "../../../commons/utils/constants.js";

export class InternalApiClient extends JsonApiClient {
  private readonly baseUrl: string;
  private readonly commonHeaders: NonNullable<RequestInit["headers"]>;

  constructor(event?: APIGatewayProxyEvent) {
    super("Internal API", event);

    assert(process.env["INTERNAL_API_URL"], "INTERNAL_API_URL is not set");

    this.baseUrl = process.env["INTERNAL_API_URL"];

    this.commonHeaders = {
      "Content-Type": "application/json",
    };
  }

  async generateOTP(
    publicSubjectId: string,
    body: {
      source: Source;
      reissueUnusedUnexpiredOTP: boolean;
      expiresIn: number;
      maxAllowedBeforeLockout: {
        count: number;
        window: number;
      };
      lockoutDuration: number;
    },
  ) {
    return this.logOnError("generateOTP", async () => {
      try {
        const response = await this.fetch(
          `${this.baseUrl}/generate-otp/${publicSubjectId}`,
          {
            method: "POST",
            headers: this.commonHeaders,
            body: JSON.stringify(body),
          },
        );

        const errorsCodesMap = {
          "1001": "InvalidRequest",
          "1002": LockoutType.TooManyOTPsRequested,
          "1003": LockoutType.TooManyIncorrectOTPsEntered,
        } as const;

        return await InternalApiClient.processResponse(
          response,
          v.object({
            otp: v.string(),
            expires: v.number(),
          }),
          errorsCodesMap,
        );
      } catch (error) {
        return {
          ...InternalApiClient.unknownError,
          errorDetails: error,
        };
      }
    });
  }

  async checkOTP(
    publicSubjectId: string,
    body: {
      otp: string;
      source: Source;
      maxAllowedBeforeLockout: {
        count: number;
        window: number;
      };
      lockoutDuration: number;
    },
  ) {
    return this.logOnError("checkOTP", async () => {
      try {
        const response = await this.fetch(
          `${this.baseUrl}/check-otp/${publicSubjectId}`,
          {
            method: "POST",
            headers: this.commonHeaders,
            body: JSON.stringify(body),
          },
        );

        const errorsCodesMap = {
          "1001": "InvalidRequest",
          "1002": LockoutType.TooManyIncorrectOTPsEntered,
          "1003": "InvalidOTP",
        } as const;

        return await InternalApiClient.processResponse(
          response,
          InternalApiClient.undefinedSchema,
          errorsCodesMap,
        );
      } catch (error) {
        return {
          ...InternalApiClient.unknownError,
          errorDetails: error,
        };
      }
    });
  }

  async checkPassword(
    publicSubjectId: string,
    body: {
      password: string;
      source: Source;
      maxAllowedBeforeLockout: {
        count: number;
        window: number;
      };
      lockoutDuration: number;
    },
  ) {
    return this.logOnError("checkPassword", async () => {
      try {
        const response = await this.fetch(
          `${this.baseUrl}/check-password/${publicSubjectId}`,
          {
            method: "POST",
            headers: this.commonHeaders,
            body: JSON.stringify(body),
          },
        );

        const errorsCodesMap = {
          "1001": "InvalidRequest",
          "1002": LockoutType.TooManyIncorrectPasswordsEntered,
          "1003": "InvalidPassword",
        } as const;

        return await InternalApiClient.processResponse(
          response,
          InternalApiClient.undefinedSchema,
          errorsCodesMap,
        );
      } catch (error) {
        return {
          ...InternalApiClient.unknownError,
          errorDetails: error,
        };
      }
    });
  }

  async getLockoutStatus(
    publicSubjectId: string,
    body: {
      source: Source;
      lockoutType?: LockoutType;
    },
  ) {
    return this.logOnError("getLockoutStatus", async () => {
      try {
        const response = await this.fetch(
          `${this.baseUrl}/lockout-status/${publicSubjectId}`,
          {
            headers: this.commonHeaders,
            body: JSON.stringify(body),
          },
        );

        const errorsCodesMap = {
          "1001": "InvalidRequest",
        } as const;

        return await InternalApiClient.processResponse(
          response,
          v.variant("isLockedOut", [
            v.object({
              isLockedOut: v.literal(false),
            }),
            v.object({
              isLockedOut: v.literal(true),
              lockoutType: v.enum(LockoutType),
            }),
          ]),
          errorsCodesMap,
        );
      } catch (error) {
        return {
          ...InternalApiClient.unknownError,
          errorDetails: error,
        };
      }
    });
  }
}
