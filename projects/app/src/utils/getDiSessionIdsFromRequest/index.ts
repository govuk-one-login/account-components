import type { FastifyRequest } from "fastify";

export const getDiSessionIdsFromRequest = (req?: FastifyRequest) => {
  const cookies = req?.cookies ?? {};

  const gsCookieParts = (cookies["gs"] ?? "").split(".");
  return {
    persistentSessionId: cookies["di-persistent-session-id"] ?? "",
    sessionId: gsCookieParts[0],
    clientSessionId: gsCookieParts[1] ?? "",
  };
};
