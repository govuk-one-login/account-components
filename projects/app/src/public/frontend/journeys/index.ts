import type { FastifyTypeboxInstance } from "../../../app.js";
import { deleteAccount } from "./deleteAccount/index.js";

export const journeys = function (app: FastifyTypeboxInstance) {
  app.addHook("onRequest", () => {
    // TODO signed in check e.g.
    // if (not signed in) {
    //   redirect elsewhere
    // }
  });

  app.register(deleteAccount);
};
