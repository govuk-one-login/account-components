import type { FastifyRequest, FastifyReply } from "fastify";

export async function passkeysGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // Implement the logic for handling the GET request for passkeys here
  reply.send({ message: "Passkeys GET handler not implemented yet." });
  return reply;
}

export async function passkeysPostHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // Implement the logic for handling the POST request for passkeys here
  reply.send({ message: "Passkeys POST handler not implemented yet." });
  return reply;
}
