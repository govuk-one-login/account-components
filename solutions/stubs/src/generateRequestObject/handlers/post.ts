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

  const accessToken = await generateAccessToken(body);
  body.access_token = accessToken;

  const scenario = getScenario(body);

  const token = await generateJwtToken(body, scenario);

  const encryptedJar = await buildJar(token);

  await reply.send(encryptedJar);
  return reply;
}
