import type { Source } from "../../../commons/utils/constants.js";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";
import { otpsDatabaseItem } from "../../../commons/utils/schemas.js";
import * as v from "valibot";

const dynamodbClient = getDynamoDbClient();

export const getLatestOtp = async ({
  publicSubjectId,
  source,
}: {
  publicSubjectId: string;
  source: Source;
}) => {
  const result = await dynamodbClient.query({
    TableName: process.env["OTPS_TABLE_NAME"],
    IndexName: process.env["OTPS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"],
    KeyConditionExpression: "publicSubjectId = :publicSubjectId",
    FilterExpression: "#source = :source",
    ExpressionAttributeValues: {
      ":publicSubjectId": publicSubjectId,
      ":source": source,
    },
    ExpressionAttributeNames: {
      "#source": "source",
    },
    ScanIndexForward: false,
  });

  const otps = v.parse(v.array(otpsDatabaseItem), result.Items);
  return otps[0];
};
