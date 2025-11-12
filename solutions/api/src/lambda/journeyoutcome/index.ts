import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getHeader } from "../../utils/common.js";
import { errorManager } from "./utils/errors.js";
import type { JourneyOutcomeAppError } from "./utils/errors.js";
import { flushMetricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";

export const handler = flushMetricsAPIGatewayProxyHandlerWrapper(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const bearerPrefix = "Bearer ";
    const authorisationHeader = getHeader(event.headers, "Authorization");
    try {
      if (authorisationHeader?.startsWith(bearerPrefix)) {
        // process token here
      } else {
        errorManager.throwError(
          "InvalidAuthorizationHeader",
          `Authorization header is missing or does not start with '${bearerPrefix}'`,
        );
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return errorManager.handleError(error as JourneyOutcomeAppError | Error);
    }

    return {
      statusCode: 200,
      body: '"hello world"',
    };
  },
);
