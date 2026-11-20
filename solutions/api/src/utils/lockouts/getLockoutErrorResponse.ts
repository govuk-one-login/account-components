import type { APIGatewayProxyResult } from "aws-lambda";
import type {
  Source,
  LockoutType,
} from "../../../../commons/utils/constants.js";
import { getLockouts } from "./getLockouts.js";

export const getLockoutErrorResponse = async ({
  publicSubjectId,
  lockoutToCheckFor,
  source,
  errorCode,
}: {
  publicSubjectId: string;
  lockoutToCheckFor: LockoutType;
  source: Source;
  errorCode: number;
}): Promise<APIGatewayProxyResult | undefined> => {
  const lockouts = await getLockouts({
    publicSubjectId,
    source,
    type: lockoutToCheckFor,
  });

  if (lockouts.length) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        code: errorCode,
        message: lockoutToCheckFor,
      }),
    };
  }

  return undefined;
};
