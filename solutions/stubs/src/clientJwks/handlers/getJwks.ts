import { type FastifyReply, type FastifyRequest } from "fastify";
import * as v from "valibot";

export async function getJwks(request: FastifyRequest, reply: FastifyReply) {
  const parsedRequestParams = v.safeParse(
    v.object({
      client: v.string(),
    }),
    request.params,
  );

  if (!parsedRequestParams.success) {
    reply.status(400).send(parsedRequestParams.issues);
    return reply;
  }
}
