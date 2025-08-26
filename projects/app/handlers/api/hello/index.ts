import type { FastifyReply, FastifyRequest } from "fastify";
import { bigString } from "./bigstring.js";

export function hello(_request: FastifyRequest, reply: FastifyReply) {
  reply.send({ hello: bigString });
}
