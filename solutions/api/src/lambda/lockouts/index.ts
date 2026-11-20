import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { metricsAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/metrics/index.js";
import { loggerAPIGatewayProxyHandlerWrapper } from "../../../../commons/utils/logger/index.js";
import { normalizeAPIGatewayProxyEventHandlerWrapper } from "../../../../commons/utils/normalizeAPIGatewayProxyEventHandlerWrapper/index.js";
import * as v from "valibot";
import { LockoutType, Source } from "../../../../commons/utils/constants.js";
import { getLockouts } from "../../utils/lockouts/getLockouts.js";
import { invalidRequestResponse } from "../../utils/common.js";

export const handler = normalizeAPIGatewayProxyEventHandlerWrapper(
  loggerAPIGatewayProxyHandlerWrapper(
    metricsAPIGatewayProxyHandlerWrapper(
      async (e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const pathParams = v.safeParse(
          v.object({
            publicSubjectId: v.string(),
          }),
          e.pathParameters,
        );

        const queryParams = v.safeParse(
          v.object({
            source: v.enum(Source),
            type: v.optional(v.enum(LockoutType)),
          }),
          e.queryStringParameters,
        );

        if (!pathParams.success || !queryParams.success) {
          return invalidRequestResponse;
        }

        return {
          statusCode: 200,
          body: JSON.stringify(
            await getLockouts({
              publicSubjectId: pathParams.output.publicSubjectId,
              source: queryParams.output.source,
              type: queryParams.output.type,
            }),
          ),
        };
      },
    ),
  ),
);
