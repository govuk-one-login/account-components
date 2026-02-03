import type { FastifyInstance } from "fastify";
import { paths } from "../utils/paths.js";
import {
  passkeysGetHandler,
  passkeysPostHandler,
  passkeysDeleteHandler,
  passkeysPatchHandler,
} from "./handlers/passkeys.js";

export const passKeys = function (app: FastifyInstance) {
  app.get(paths.passKeys.user, passkeysGetHandler);
  app.post(paths.passKeys.user, passkeysPostHandler);
  app.delete(paths.passKeys.resource, passkeysDeleteHandler);
  app.patch(paths.passKeys.resource, passkeysPatchHandler);
};
