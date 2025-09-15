import type { FastifyTypeboxInstance } from "../app.js";

export const privateRoutes = function (app: FastifyTypeboxInstance) {
  app.get("/private-healthcheck", async function (_request, reply) {
    return reply.send("ok");
  });
};
