import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import { errorManager } from "./errors.js";
import type { JourneyOutcome } from "../../../../../commons/utils/interfaces.js";
import type { JourneyOutcomePayload } from "./interfaces.js";

export const getJourneyOutcome = async (
  payload: JourneyOutcomePayload,
): Promise<JourneyOutcome | undefined> => {
  const dynamoDb = getDynamoDbClient();
  try {
    const result = await dynamoDb.get({
      TableName: process.env["JOURNEY_OUTCOME_TABLE_NAME"],
      Key: {
        outcome_id: payload.outcome_id,
      },
    });

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return result.Item?.["outcome"] as JourneyOutcome | undefined;
  } catch (error) {
    errorManager.throwError(
      "FailedToFindOutcome",
      `A problem occurred while retrieving the journey outcome: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    // line below is to appease the linter; not actually needed as errorManager.throwError will throw an exception
    return undefined;
  }
};
