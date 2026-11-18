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
import { passwordChecksDatabaseItem } from "../../../../commons/utils/schemas.js";
import { randomUUID } from "node:crypto";
import { maybeCreateLockout } from "../../utils/lockouts/maybeCreateLockout.js";
import assert from "node:assert";
import { getLockoutErrorResponse } from "../../utils/lockouts/getLockoutErrorResponse.js";
import { getBaseBodySchemaForEndpointWithLockouts } from "../../utils/lockouts/getBaseBodySchemaForEndpointWithLockouts.js";
import { AccountDataApiClient } from "../../../../commons/utils/apiClients/accountDataApiClient.js";
import { getSafeValibotIssues } from "../../../../commons/utils/getSafeValibotIssues/index.js";
import { invalidRequestResponse } from "../../utils/common.js";

const dynamodbClient = getDynamoDbClient();

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        assert.ok(process.env["PASSWORD_CHECKS_TABLE_NAME"]);
        assert.ok(
          process.env["PASSWORD_CHECKS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
        );

        const headers = v.safeParse(
          v.object({
            "x-adapi-accesstoken": v.string(),
          }),
          e.headers,
        );

        if (!headers.success) {
          logger.info("Invalid headers", {
            issues: getSafeValibotIssues(headers.issues),
          });
          return invalidRequestResponse;
        }

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
                  LockoutType.TooManyIncorrectPasswordsEntered,
                ],
              }).entries,
              password: v.string(),
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

        const accountDataApiClient = new AccountDataApiClient(
          headers.output["x-adapi-accesstoken"],
          e,
        );

        const verifyPasswordResponse =
          await accountDataApiClient.verifyPassword(
            pathParams.output.publicSubjectId,
            body.output.password,
          );

        if (!verifyPasswordResponse.success) {
          throw new Error(verifyPasswordResponse.error);
        }

        const passwordCheckItem = v.parse(passwordChecksDatabaseItem, {
          id: randomUUID(),
          publicSubjectId: pathParams.output.publicSubjectId,
          createdAt: now,
          source: body.output.source,
          successful: verifyPasswordResponse.result.verified,
          keepUntil: now + oneYearInSeconds,
        });

        await dynamodbClient.put({
          TableName: process.env["PASSWORD_CHECKS_TABLE_NAME"],
          Item: passwordCheckItem,
          ConditionExpression: "attribute_not_exists(id)",
        });

        if (verifyPasswordResponse.result.verified) {
          return {
            statusCode: 204,
            body: "",
          };
        }

        await maybeCreateLockout({
          publicSubjectId: pathParams.output.publicSubjectId,
          source: body.output.source,
          type: LockoutType.TooManyIncorrectPasswordsEntered,
          tableName: process.env["PASSWORD_CHECKS_TABLE_NAME"],
          publicSubjectIdGsiName:
            process.env["PASSWORD_CHECKS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
          itemSchema: passwordChecksDatabaseItem,
          itemShouldContributeToLockout: (item) =>
            !item.successful && !(item.lockouts ?? []).length,
          itemCountForLockout: body.output.maxAllowedBeforeLockout?.count,
          window: body.output.maxAllowedBeforeLockout?.window,
          duration: body.output.lockoutDuration,
        });

        return {
          statusCode: 401,
          body: JSON.stringify({ code: 1005, message: "InvalidPassword" }),
        };
      },
    ),
  ),
);
