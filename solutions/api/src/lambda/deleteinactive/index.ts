import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import {
  logger,
  loggerAPIGatewayProxyHandlerWrapper,
} from "../../../../commons/utils/logger/index.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, paginateScan } from "@aws-sdk/lib-dynamodb";
import { ErrorManager } from "../../utils/common.js";
import type { ErrorType } from "../../utils/common.js";

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  metricsAPIGatewayProxyHandlerWrapper(
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const dynamodbClient = new DynamoDBClient();
      const activityLogClient = DynamoDBDocumentClient.from(dynamodbClient);
      const errorManager = new ErrorManager<Record<"ScanError", ErrorType>>({
        ScanError: {
          code: "ScanError",
          description: "Failed to scan activity log",
          statusCode: 500,
        },
      });
      logger.info(
        `Starting to fetch inactive users from activity log: ${event.body ?? "no body"}`,
      );

      const getActivityHistory = async () => {
        const params = {
          TableName: "activity_log",
          FilterExpression: "#year <= :fiveYearsAgo",
          ExpressionAttributeNames: {
            "#year": "timestamp",
          },
          ExpressionAttributeValues: {
            ":fiveYearsAgo": new Date().setFullYear(
              new Date().getFullYear() - 5,
            ),
          },
        };

        const paginatedScan = paginateScan(
          { client: activityLogClient },
          params,
        );
        const lastActiveFiveYearsAgo = [];

        try {
          for await (const page of paginatedScan) {
            if (page.Items) {
              lastActiveFiveYearsAgo.push(...page.Items);
            }
          }
        } catch (error) {
          logger.error("Error scanning activity log table", { error });
          errorManager.throwError(
            "ScanError",
            "Error scanning activity log table",
          );
        }
        return lastActiveFiveYearsAgo;
      };
      const inactiveUsers = await getActivityHistory();

      return {
        statusCode: 200,
        body: JSON.stringify({
          inactiveUsers,
        }),
      };
    },
  ),
);
