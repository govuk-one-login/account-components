import type { FastifyInstance } from "fastify";
import { paths } from "../utils/paths.js";
import { passkeysPostHandler } from "./handlers/passkeys.js";

export const accountDataApi = function (app: FastifyInstance) {
  app.post(paths.accountDataApi.createPassKey, passkeysPostHandler);
};
