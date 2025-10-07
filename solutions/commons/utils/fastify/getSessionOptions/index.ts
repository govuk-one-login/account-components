import type { FastifySessionOptions } from "@fastify/session";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";

export const getSessionOptions = (): FastifySessionOptions => ({
  secret: [
    "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
  ],
  cookie: {
    secure: getEnvironment() !== "local",
    sameSite: "lax",
  },
});
