import { generateAccessToken } from "../../utils/access-token.js";
import { buildJar } from "../utils/buildJar/index.js";
import {
  generateJwtToken,
  getScenario,
} from "../utils/tokenGenerator/index.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type * as v from "valibot";
import type { requestBodySchema } from "./create.js";
import type { AuthorizeRequestObject } from "../../types/common.js";

export async function generateRequestObjectPost(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const body = request.body as v.InferOutput<typeof requestBodySchema>;

  const authorizeRequestObject: AuthorizeRequestObject = { ...body };
  delete authorizeRequestObject["account_management_api_authenticate_scenario"];
  delete authorizeRequestObject[
    "account_management_api_deleteAccount_scenario"
  ];
  delete authorizeRequestObject[
    "account_management_api_sendOtpChallenge_scenario"
  ];
  delete authorizeRequestObject[
    "account_management_api_verifyOtpChallenge_scenario"
  ];

  authorizeRequestObject.account_management_api_access_token =
    await generateAccessToken({
      authenticate_scenario: body.account_management_api_authenticate_scenario,
      deleteAccount_scenario:
        body.account_management_api_deleteAccount_scenario,
      sendOtpChallenge_scenario:
        body.account_management_api_sendOtpChallenge_scenario,
      verifyOtpChallenge_scenario:
        body.account_management_api_verifyOtpChallenge_scenario,
    });
  authorizeRequestObject.account_data_api_access_token =
    await generateAccessToken({
      createPassKey_scenario:
        body.account_management_api_createPassKey_scenario,
    });

  const scenario = getScenario(authorizeRequestObject);

  const { token, jwtPayload, jwtHeader } = await generateJwtToken(
    authorizeRequestObject,
    scenario,
  );
  const encryptedJar = await buildJar(token);

  await reply.send({ encryptedJar, jwtPayload, jwtHeader });
  return reply;
}
