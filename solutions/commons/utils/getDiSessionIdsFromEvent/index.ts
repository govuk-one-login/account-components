import type { APIGatewayProxyEvent } from "aws-lambda";
import { parse } from "cookie";

export const getDiSessionIdsFromEvent = (event: APIGatewayProxyEvent) => {
  const cookies = parse(event.headers["cookie"] ?? "");
  const gsCookie = cookies["gs"];
  const gsCookieParts = gsCookie ? gsCookie.split(".") : [];

  return {
    persistentSessionId:
      event.headers["di-persistent-session-id"] ??
      cookies["di-persistent-session-id"],
    sessionId: event.headers["session-id"] ?? gsCookieParts[0],
    clientSessionId: event.headers["client-session-id"] ?? gsCookieParts[1],
  };
};
