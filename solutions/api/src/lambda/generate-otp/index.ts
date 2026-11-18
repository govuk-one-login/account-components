import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";
import * as v from "valibot";
import {
  LockoutType,
  oneYearInSeconds,
} from "../../../../commons/utils/constants.js";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { otpsDatabaseItem } from "../../../../commons/utils/schemas.js";
import { randomInt, randomUUID } from "node:crypto";
import { getLatestOtp } from "../../utils/getLatestOtp.js";
import { maybeCreateLockout } from "../../utils/lockouts/maybeCreateLockout.js";
import assert from "node:assert";
import { getLockoutErrorResponse } from "../../utils/lockouts/getLockoutErrorResponse.js";
import { getBaseBodySchemaForEndpointWithLockouts } from "../../utils/lockouts/getBaseBodySchemaForEndpointWithLockouts.js";

const dynamodbClient = getDynamoDbClient();

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        assert.ok(process.env["OTPS_TABLE_NAME"]);
        assert.ok(process.env["OTPS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"]);

        const pathParams = v.safeParse(
          v.object({
            publicSubjectId: v.string(),
          }),
          e.pathParameters,
        );

        const body = v.safeParse(
          v.pipe(
            v.string(),
            v.parseJson(),
            v.object({
              ...getBaseBodySchemaForEndpointWithLockouts({
                lockoutTypesToAlwaysCheckFor: [
                  LockoutType.TooManyOTPsRequested,
                ],
              }).entries,
              reissueUnusedUnexpiredOTP: v.optional(v.boolean(), true),
              expiresIn: v.optional(
                v.pipe(v.number(), v.integer(), v.gtValue(0)),
                900,
              ),
            }),
          ),
          e.body,
        );

        if (!pathParams.success || !body.success) {
          return {
            statusCode: 400,
            body: JSON.stringify({ code: 1001, message: "InvalidRequest" }),
          };
        }

        const lockoutErrorResponse = await getLockoutErrorResponse({
          publicSubjectId: pathParams.output.publicSubjectId,
          lockoutsToCheckFor: body.output.lockoutsToCheckFor,
          source: body.output.source,
        });

        if (lockoutErrorResponse) {
          return lockoutErrorResponse;
        }

        const now = Math.floor(Date.now() / 1000);

        const existingOtp = await getLatestOtp({
          publicSubjectId: pathParams.output.publicSubjectId,
          source: body.output.source,
        });

        const reuseOtp =
          !!existingOtp &&
          body.output.reissueUnusedUnexpiredOTP &&
          !existingOtp.used &&
          existingOtp.expiresAt >= now + 120 &&
          now + body.output.expiresIn >= existingOtp.expiresAt;

        const otpItem = v.parse(otpsDatabaseItem, {
          id: randomUUID(),
          publicSubjectId: pathParams.output.publicSubjectId,
          createdAt: now,
          source: body.output.source,
          used: false,
          keepUntil: now + oneYearInSeconds,
          expiresAt: reuseOtp
            ? existingOtp.expiresAt
            : now + body.output.expiresIn,
          otp: reuseOtp
            ? existingOtp.otp
            : String(randomInt(0, 1000000)).padStart(6, "0"),
        });

        await dynamodbClient.put({
          TableName: process.env["OTPS_TABLE_NAME"],
          Item: otpItem,
          ConditionExpression: "attribute_not_exists(id)",
        });

        await maybeCreateLockout({
          publicSubjectId: pathParams.output.publicSubjectId,
          source: body.output.source,
          type: LockoutType.TooManyOTPsRequested,
          tableName: process.env["OTPS_TABLE_NAME"],
          publicSubjectIdGsiName:
            process.env["OTPS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
          itemSchema: otpsDatabaseItem,
          itemShouldContributeToLockout: (item) =>
            !item.used && !(item.lockouts ?? []).length,
          itemCountForLockout: body.output.maxAllowedBeforeLockout?.count,
          window: body.output.maxAllowedBeforeLockout?.window,
          duration: body.output.lockoutDuration,
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            otp: otpItem.otp,
            expiresAt: otpItem.expiresAt,
          }),
        };
      },
    ),
  ),
);
