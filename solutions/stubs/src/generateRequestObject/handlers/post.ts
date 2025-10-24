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
  const body = request.body as RequestBody;

  body.access_token = await generateAccessToken();
  body.refresh_token = await generateAccessToken();

  const scenario = getScenario(body);

  const { token, jwtPayload, jwtHeader } = await generateJwtToken(
    body,
    scenario,
  );
  const encryptedJar = await buildJar(token);

  await reply.send({ encryptedJar, jwtPayload, jwtHeader });
  return reply;
}
