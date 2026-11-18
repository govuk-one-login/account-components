import type { APIGatewayProxyResult } from "aws-lambda";
import type { Source } from "../../../../commons/utils/constants.js";
import { LockoutType } from "../../../../commons/utils/constants.js";
import { getLockouts } from "./getLockouts.js";

const lockoutErrorCodes: Record<LockoutType, number> = {
  [LockoutType.TooManyOTPsRequested]: 1002,
  [LockoutType.TooManyIncorrectOTPsEntered]: 1003,
  [LockoutType.TooManyIncorrectPasswordsEntered]: 1004,
};

export const getLockoutErrorResponse = async ({
  publicSubjectId,
  lockoutsToCheckFor,
  source,
}: {
  publicSubjectId: string;
  lockoutsToCheckFor: LockoutType[];
  source: Source;
}): Promise<APIGatewayProxyResult | undefined> => {
  for (const lockoutType of lockoutsToCheckFor) {
    const lockouts = await getLockouts({
      publicSubjectId,
      source,
      type: lockoutType,
    });
    if (lockouts.length) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          code: lockoutErrorCodes[lockoutType],
          message: lockoutType,
        }),
      };
    }
  }
  return undefined;
};
