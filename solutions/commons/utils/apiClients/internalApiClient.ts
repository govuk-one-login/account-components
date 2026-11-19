import assert from "node:assert";
import { JsonApiClient } from "./jsonApiClient.js";
import type { APIGatewayProxyEvent } from "aws-lambda";
import * as v from "valibot";
import type { Source } from "../../../commons/utils/constants.js";
import { LockoutType } from "../../../commons/utils/constants.js";
import { getEnvironment } from "../../../commons/utils/getEnvironment/index.js";
import { lockoutsDatabaseItem } from "../schemas.js";

const unixEpochTimeInSecondsToDate = v.transform(
  (value: number) => new Date(value * 1000),
);

const lockoutSchema = v.looseObject({
  id: lockoutsDatabaseItem.entries.id,
  lockedOutAt: v.pipe(
    lockoutsDatabaseItem.entries.lockedOutAt,
    unixEpochTimeInSecondsToDate,
  ),
  lockedOutUntil: v.pipe(
    lockoutsDatabaseItem.entries.lockedOutUntil,
    unixEpochTimeInSecondsToDate,
  ),
  type: lockoutsDatabaseItem.entries.type,
  source: lockoutsDatabaseItem.entries.source,
});

export class InternalApiClient extends JsonApiClient {
  private readonly baseUrl: string;
  private readonly commonHeaders: NonNullable<RequestInit["headers"]>;

  constructor(accessToken?: string, event?: APIGatewayProxyEvent) {
    super("Internal API", event);

    assert(process.env["INTERNAL_API_URL"], "INTERNAL_API_URL is not set");

    this.baseUrl = process.env["INTERNAL_API_URL"];

    this.commonHeaders = {
      "Content-Type": "application/json",
    };

    // The access token is not used by the real internal API, only by
    // the stub version where it contains information about which scenario
    // to simulate
    if (
      ["local", "dev", "build"].includes(getEnvironment()) &&
      accessToken !== undefined
    ) {
      this.commonHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  async generateOTP({
    publicSubjectId,
    ...body
  }: {
    publicSubjectId: string;
    source: Source;
    reissueUnusedUnexpiredOTP?: boolean;
    expiresIn?: number;
    maxAllowedBeforeLockout?: {
      count: number;
      window: number;
    };
    lockoutDuration?: number;
  }) {
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
        } as const;

        return await InternalApiClient.processResponse(
          response,
          v.object({
            otp: v.string(),
            expiresAt: v.pipe(v.number(), unixEpochTimeInSecondsToDate),
            lockout: v.optional(
              v.looseObject({
                ...lockoutSchema.entries,
                type: v.literal(LockoutType.TooManyOTPsRequested),
              }),
            ),
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

  async checkOTP({
    publicSubjectId,
    ...body
  }: {
    publicSubjectId: string;
    otp: string;
    source: Source;
    maxAllowedBeforeLockout?: {
      count: number;
      window: number;
    };
    lockoutDuration?: number;
  }) {
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
        } as const;

        return await InternalApiClient.processResponse(
          response,
          v.variant("valid", [
            v.object({
              valid: v.literal(true),
            }),
            v.object({
              valid: v.literal(false),
              lockout: v.optional(
                v.looseObject({
                  ...lockoutSchema.entries,
                  type: v.literal(LockoutType.TooManyIncorrectOTPsEntered),
                }),
              ),
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

  async checkPassword({
    adapiAccessToken,
    publicSubjectId,
    ...body
  }: {
    adapiAccessToken: string;
    publicSubjectId: string;
    password: string;
    source: Source;
    maxAllowedBeforeLockout?: {
      count: number;
      window: number;
    };
    lockoutDuration?: number;
  }) {
    return this.logOnError("checkPassword", async () => {
      try {
        const response = await this.fetch(
          `${this.baseUrl}/check-password/${publicSubjectId}`,
          {
            method: "POST",
            headers: Object.assign({}, this.commonHeaders, {
              "x-adapi-accesstoken": adapiAccessToken,
            }),
            body: JSON.stringify(body),
          },
        );

        const errorsCodesMap = {
          "1001": "InvalidRequest",
          "1002": LockoutType.TooManyIncorrectPasswordsEntered,
        } as const;

        return await InternalApiClient.processResponse(
          response,
          v.variant("valid", [
            v.object({
              valid: v.literal(true),
            }),
            v.object({
              valid: v.literal(false),
              lockout: v.optional(
                v.looseObject({
                  ...lockoutSchema.entries,
                  type: v.literal(LockoutType.TooManyIncorrectPasswordsEntered),
                }),
              ),
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

  async getLockouts({
    publicSubjectId,
    ...parameters
  }: {
    publicSubjectId: string;
    source: Source;
    type?: LockoutType;
  }) {
    return this.logOnError("getLockouts", async () => {
      try {
        const queryString = new URLSearchParams(parameters);

        const response = await this.fetch(
          `${this.baseUrl}/lockouts/${publicSubjectId}?${queryString.toString()}`,
          {
            headers: this.commonHeaders,
          },
        );

        const errorsCodesMap = {
          "1001": "InvalidRequest",
        } as const;

        return await InternalApiClient.processResponse(
          response,
          v.array(lockoutSchema),
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
