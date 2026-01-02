import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
// eslint-disable-next-line no-restricted-imports
import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "node:crypto";
import { getDynamoDbClient } from "../commons/utils/awsClient/dynamodbClient/index.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../commons/utils/logger/index.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../commons/utils/metrics/index.js";

const logger = new Logger();

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  metricsAPIGatewayProxyHandlerWrapper(
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    logger.info("event", { event });
    // const dbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient(getAwsClientConfig()))
    // const db = DynamoDBDocumentClient.from(dbClient);
    const db = getDynamoDbClient();
    logger.info("db.config", { config: db.config })
    const nonce = randomUUID()
    const expiry = Math.floor(Date.now() / 1000) + 60
    await db.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: process.env["REPLAY_ATTACK_TABLE_NAME"],
            Item: {
              nonce: nonce,
              expires: expiry
            },
            ConditionExpression: "attribute_not_exists(nonce)",
           }
        }]
    })
    const result = await db.get({
      TableName: process.env["REPLAY_ATTACK_TABLE_NAME"],
      Key: {
        nonce: nonce,
      },
    });
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }
}));