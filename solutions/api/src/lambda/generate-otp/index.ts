import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";
import * as v from "valibot";
import {
  LockoutType,
  oneYearInSeconds,
  Source,
} from "../../../../commons/utils/constants.js";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { otpsDatabaseItem } from "../../../../commons/utils/schemas.js";
import { randomInt, randomUUID } from "node:crypto";
import { maybeCreateLockout } from "../../utils/lockouts/maybeCreateLockout.js";
import assert from "node:assert";
import { getLockoutErrorResponse } from "../../utils/getLockoutErrorResponse.js";

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
              source: v.enum(Source),
              reissueUnusedUnexpiredOTP: v.optional(v.boolean(), true),
              expiresIn: v.optional(
                v.pipe(v.number(), v.integer(), v.gtValue(0)),
                900,
              ),
              lockoutDuration: v.optional(
                v.pipe(v.number(), v.integer(), v.gtValue(0)),
              ),
              lockoutsToCheckFor: v.optional(
                v.pipe(
                  v.array(v.enum(LockoutType)),
                  v.check((arr) =>
                    arr.includes(LockoutType.TooManyOTPsRequested),
                  ),
                ),
                [LockoutType.TooManyOTPsRequested],
              ),
              maxAllowedBeforeLockout: v.optional(
                v.object({
                  count: v.optional(
                    v.pipe(v.number(), v.integer(), v.gtValue(0)),
                  ),
                  window: v.optional(
                    v.pipe(v.number(), v.integer(), v.gtValue(0)),
                  ),
                }),
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

        const otpsResult = await dynamodbClient.query({
          TableName: process.env["OTPS_TABLE_NAME"],
          IndexName: process.env["OTPS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
          KeyConditionExpression: "publicSubjectId = :publicSubjectId",
          FilterExpression: "#source = :source",
          ExpressionAttributeValues: {
            ":publicSubjectId": pathParams.output.publicSubjectId,
            ":source": body.output.source,
          },
          ExpressionAttributeNames: {
            "#source": "source",
          },
          ScanIndexForward: false,
        });

        const otps = v.parse(v.array(otpsDatabaseItem), otpsResult.Items);
        const existingOtp = otps[0];

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
