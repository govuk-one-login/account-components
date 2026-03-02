import { getDynamoDbClient } from "../../../../../commons/utils/awsClient/dynamodbClient/index.js";
import type { JourneyOutcome } from "../../../../../commons/utils/interfaces.js";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { errorManager } from "./errors.js";
import type { JourneyOutcomePayload } from "./interfaces.js";

export const getJourneyOutcome = async (
  payload: JourneyOutcomePayload,
): Promise<JourneyOutcome> => {
  const dynamoDb = getDynamoDbClient();
  try {
    const result = await dynamoDb.get({
      TableName: process.env["JOURNEY_OUTCOME_TABLE_NAME"],
      Key: {
        outcome_id: payload.outcome_id,
      },
      ProjectionExpression:
        "outcome_id, #sub, email, #scope, success, journeys",
      ExpressionAttributeNames: {
        "#sub": "sub",
        "#scope": "scope",
      },
    });

    if (!result.Item) {
      errorManager.throwError(
        "MissingOutcome",
        `Missing outcome with outcome_id: ${payload.outcome_id ?? "undefined"} and jti: ${payload.jti ?? "undefined"}`,
      );
      throw new Error("Unreachable code reached");
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const outcome = result.Item as JourneyOutcome;

    metrics.addDimensions({
      scope: outcome.scope,
    });
    logger.appendKeys({
      scope: outcome.scope,
    });

    if (outcome.sub !== payload.sub) {
      errorManager.throwError(
        "OutcomeSubDoesNotMatchPayload",
        `Outcome sub does not match payload sub with outcome_id: ${payload.outcome_id ?? "undefined"} and jti: ${payload.jti ?? "undefined"}`,
      );
      throw new Error("Unreachable code reached");
    }

    return outcome;
  } catch (error) {
    errorManager.throwError(
      "FailedToFindOutcome",
      `A problem occurred while retrieving the journey outcome: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw new Error("Unreachable code reached", { cause: error });
  }
};
