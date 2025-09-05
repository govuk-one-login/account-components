import { type FastifyInstance } from "fastify";

export const api = function (app: FastifyInstance) {
  app.register(
    function (app) {
      app.get(
        "/hello",
        {
          schema: {
            querystring: {
              type: "object",
              properties: {
                foo: { type: "number" },
                bar: { type: "string" },
              },
              required: ["foo", "bar"],
            },
          },
        },
        async function (request, reply) {
          (await import("./handlers/api/hello/index.js")).hello(request, reply);
        },
      );
    },
    {
      prefix: "/api",
    },
  );
};
