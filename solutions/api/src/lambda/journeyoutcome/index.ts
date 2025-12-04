import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getHeader } from "../../utils/common.js";
import { errorManager } from "./utils/errors.js";
import type { JourneyOutcomeAppError } from "./utils/errors.js";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import assert from "node:assert";
import { verifySignatureAndGetPayload } from "./utils/verifySignatureAndGetPayload.js";
import { getKMSKey } from "./utils/getKmsKey.js";
import { validateJourneyOutcomeJwtClaims } from "./utils/validateJourneyOutcomeJwtClaims.js";
import type { JourneyInfoPayload } from "./utils/validateJourneyOutcomeJwtClaims.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";

export const handler = loggerAPIGatewayProxyHandlerWrapper(
  metricsAPIGatewayProxyHandlerWrapper(
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const bearerPrefix = "Bearer ";
      const authorisationHeader = getHeader(event.headers, "Authorization");

      assert(
        process.env["JWT_SIGNING_KEY_ALIAS"],
        "JWT_SIGNING_KEY_ALIAS not set",
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
          const key = await getKMSKey(process.env["JWT_SIGNING_KEY_ALIAS"]);
          const payload: JourneyInfoPayload =
            await verifySignatureAndGetPayload(token, key);

          validateJourneyOutcomeJwtClaims(payload);
        } else {
          errorManager.throwError(
            "InvalidAuthorizationHeader",
            `Token is empty after removing '${bearerPrefix}'`,
          );
        }
        return {
          statusCode: 200,
          body: '"hello world"',
        };
      } catch (error) {
        return errorManager.handleError(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          error as JourneyOutcomeAppError | Error,
        );
      }
    },
  ),
);
