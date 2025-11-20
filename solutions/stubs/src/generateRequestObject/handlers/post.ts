import type { RequestBody } from "../../types/common.js";
import { generateAccessToken } from "../../utils/access-token.js";
import { buildJar } from "../utils/buildJar/index.js";
import {
  generateJwtToken,
  getScenario,
} from "../utils/tokenGenerator/index.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function generateRequestObjectPost(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const body = request.body as RequestBody;
  body.access_token = await generateAccessToken();
  if (body.refresh_token === "true") {
    body.refresh_token = await generateAccessToken();
  } else {
    delete body.refresh_token;
  }

  const scenario = getScenario(body);

  const { token, jwtPayload, jwtHeader } = await generateJwtToken(
    body,
    scenario,
  );
  const encryptedJar = await buildJar(token);

  await reply.send({ encryptedJar, jwtPayload, jwtHeader });
  return reply;
}
