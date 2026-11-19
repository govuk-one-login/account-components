import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import {
  logger,
  loggerAPIGatewayProxyHandlerWrapper,
} from "../../../../commons/utils/logger/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";
import * as v from "valibot";
import {
  LockoutType,
  oneYearInSeconds,
} from "../../../../commons/utils/constants.js";
import { getDynamoDbClient } from "../../../../commons/utils/awsClient/dynamodbClient/index.js";
import {
  otpChecksDatabaseItem,
  otpsDatabaseItem,
} from "../../../../commons/utils/schemas.js";
import { randomUUID } from "node:crypto";
import { getLatestOtp } from "../../utils/getLatestOtp.js";
import { maybeCreateLockout } from "../../utils/lockouts/maybeCreateLockout.js";
import assert from "node:assert";
import { getLockoutErrorResponse } from "../../utils/lockouts/getLockoutErrorResponse.js";
import { getBaseBodySchemaForEndpointWithLockouts } from "../../utils/lockouts/getBaseBodySchemaForEndpointWithLockouts.js";
import { getSafeValibotIssues } from "../../../../commons/utils/getSafeValibotIssues/index.js";
import { invalidRequestResponse } from "../../utils/common.js";

const dynamodbClient = getDynamoDbClient();

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        assert.ok(process.env["OTP_CHECKS_TABLE_NAME"]);
        assert.ok(process.env["OTP_CHECKS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"]);

        const pathParams = v.safeParse(
          v.object({
            publicSubjectId: v.string(),
          }),
          e.pathParameters,
        );

        if (!pathParams.success) {
          logger.info("Invalid path parameters", {
            issues: getSafeValibotIssues(pathParams.issues),
          });
          return invalidRequestResponse;
        }

        const body = v.safeParse(
          v.pipe(
            v.string(),
            v.parseJson(),
            v.object({
              ...getBaseBodySchemaForEndpointWithLockouts({
                lockoutTypesToAlwaysCheckFor: [
                  LockoutType.TooManyIncorrectOTPsEntered,
                ],
              }).entries,
              otp: v.string(),
            }),
          ),
          e.body,
        );

        if (!body.success) {
          logger.info("Invalid body", {
            issues: getSafeValibotIssues(body.issues),
          });
          return invalidRequestResponse;
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

        const successfulOtpCheck =
          !!existingOtp &&
          !existingOtp.used &&
          existingOtp.otp === body.output.otp &&
          now < existingOtp.expiresAt;

        const otpCheckItem = v.parse(otpChecksDatabaseItem, {
          id: randomUUID(),
          publicSubjectId: pathParams.output.publicSubjectId,
          createdAt: now,
          source: body.output.source,
          successful: successfulOtpCheck,
          keepUntil: now + oneYearInSeconds,
        });

        await dynamodbClient.put({
          TableName: process.env["OTP_CHECKS_TABLE_NAME"],
          Item: otpCheckItem,
          ConditionExpression: "attribute_not_exists(id)",
        });

        if (successfulOtpCheck) {
          await dynamodbClient.put({
            TableName: process.env["OTPS_TABLE_NAME"],
            Item: v.parse(otpsDatabaseItem, {
              ...existingOtp,
              used: true,
            }),
            ConditionExpression: "attribute_exists(id)",
          });

          return {
            statusCode: 200,
            body: JSON.stringify({
              valid: true,
            }),
          };
        }

        const lockout = await maybeCreateLockout({
          publicSubjectId: pathParams.output.publicSubjectId,
          source: body.output.source,
          type: LockoutType.TooManyIncorrectOTPsEntered,
          tableName: process.env["OTP_CHECKS_TABLE_NAME"],
          publicSubjectIdGsiName:
            process.env["OTP_CHECKS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
          itemSchema: otpChecksDatabaseItem,
          itemShouldContributeToLockout: (item) =>
            !item.successful && !(item.lockouts ?? []).length,
          itemCountForLockout: body.output.maxAllowedBeforeLockout?.count,
          window: body.output.maxAllowedBeforeLockout?.window,
          duration: body.output.lockoutDuration,
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            valid: false,
            lockout,
          }),
        };
      },
    ),
  ),
);
