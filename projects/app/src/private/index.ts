import type { FastifyTypeboxInstance } from "../app.js";
import { includeRouteInOpenApiDocsTag } from "../utils/includeRouteInOpenApiDocsTag.js";

export const privateRoutes = function (app: FastifyTypeboxInstance) {
  app.get(
    "/private-healthcheck",
    { schema: { tags: [includeRouteInOpenApiDocsTag] } },
    async function (_request, reply) {
      return reply.send("ok");
    },
  );
};
