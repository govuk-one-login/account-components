import type { FastifyInstance } from "fastify";
import { paths } from "../utils/paths.js";
import {
  passkeysGetHandler,
  passkeysPostHandler,
} from "./handlers/passkeys.js";

export const passKeys = function (app: FastifyInstance) {
  app.get(paths.passKeys, passkeysGetHandler);
  app.post(paths.passKeys, passkeysPostHandler);
};
