import type { FastifyReply, FastifyRequest } from "fastify";
import * as assert from "node:assert";

export async function html(request: FastifyRequest, reply: FastifyReply) {
  assert.ok(reply.render);

  if (Math.random() > 0.5) {
    request.session.example = "foo";
  }

  return reply.render("handlers/html/template.njk", {
    items: [
      { title: request.session.example, id: 1 },
      { title: "bar", id: 2 },
    ],
  });
}
