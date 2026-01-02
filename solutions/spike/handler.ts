import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
// eslint-disable-next-line no-restricted-imports
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";
import * as AWSXRay from "aws-xray-sdk";
import { getDynamoDbClient } from "../commons/utils/awsClient/dynamodbClient/index.js";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { getAwsClientConfig } from "../commons/utils/awsClient/getAwsClientConfig/index.js";

const logger = new Logger();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    logger.info("event", { event });
    // const dbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient(getAwsClientConfig()))
    // const db = DynamoDBDocumentClient.from(dbClient);
    const db = getDynamoDbClient();
    logger.info("db.config", { config: db.config })
    const nonce = randomUUID()
    const expiry = Math.floor(Date.now() / 1000) + 60
    await db.put({
      TableName: process.env["REPLAY_ATTACK_TABLE_NAME"],
      Item: {
        nonce: nonce,
        expires: expiry
      },
      ConditionExpression: "attribute_not_exists(nonce)",
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
};