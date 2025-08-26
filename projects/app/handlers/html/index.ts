import type { FastifyReply, FastifyRequest } from "fastify";
import * as assert from "node:assert";

export async function html(request: FastifyRequest, reply: FastifyReply) {
  assert.ok(reply.render);

  request.session.example = "plarp";

  return reply.render("handlers/html/template.njk", {
    items: [
      { title: "foo", id: 1 },
      { title: "bar", id: 2 },
    ],
  });
}
