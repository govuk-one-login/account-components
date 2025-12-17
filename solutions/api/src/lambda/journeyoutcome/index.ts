import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getHeader } from "../../utils/common.js";
import { errorManager } from "./utils/errors.js";
import type { JourneyOutcomeAppError } from "./utils/errors.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import assert from "node:assert";
import { getKMSKey } from "./utils/getKmsKey.js";
import { verifySignatureAndGetPayload } from "./utils/verifySignatureAndGetPayload.js";
import { validateJourneyOutcomeJwtClaims } from "./utils/validateJourneyOutcomeJwtClaims.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";
import { getJourneyOutcome } from "./utils/getJourneyOutcome.js";
import type { JourneyOutcomePayload } from "./utils/interfaces.js";

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  metricsAPIGatewayProxyHandlerWrapper(
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const bearerPrefix = "Bearer ";
      const authorisationHeader = getHeader(event.headers, "Authorization");
      assert(
        process.env["JWT_SIGNING_KEY_ALIAS"],
        "JWT_SIGNING_KEY_ALIAS not set",
      );

      assert(
        process.env["JOURNEY_OUTCOME_TABLE_NAME"],
        "JOURNEY_OUTCOME_TABLE_NAME not set",
      );

      try {
        if (!authorisationHeader?.startsWith(bearerPrefix)) {
          errorManager.throwError(
            "InvalidAuthorizationHeader",
            `Authorization header is missing or does not start with '${bearerPrefix}'`,
          );
        }
        const token = authorisationHeader?.replace(bearerPrefix, "");

        if (token?.length) {
          // if token exists, verify signature and get payload, then validate claims
          const key = await getKMSKey(process.env["JWT_SIGNING_KEY_ALIAS"]);
          const payload: JourneyOutcomePayload =
            await verifySignatureAndGetPayload(token, key);

          validateJourneyOutcomeJwtClaims(payload);
          const outcome = await getJourneyOutcome(payload);
          return {
            statusCode: 200,
            body: JSON.stringify(outcome),
          };
        } else {
          errorManager.throwError(
            "InvalidAuthorizationHeader",
            `Token is empty after removing '${bearerPrefix}'`,
          );
        }
        return errorManager.handleError(new Error("Unreachable code reached"));
      } catch (error) {
        return errorManager.handleError(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          error as JourneyOutcomeAppError | Error,
        );
      }
    },
  ),
);
