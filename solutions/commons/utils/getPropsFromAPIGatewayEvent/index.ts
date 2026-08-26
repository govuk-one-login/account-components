import type { APIGatewayProxyEvent } from "aws-lambda";
import { parseCookie } from "cookie";

export const getPropsFromAPIGatewayEvent = (event: APIGatewayProxyEvent) => {
  const cookies = parseCookie(event.headers["cookie"] ?? "");
  const gsCookie = cookies["gs"];
  const gsCookieParts = gsCookie ? gsCookie.split(".") : [];

  return {
    persistentSessionId:
      event.headers["di-persistent-session-id"] ??
      cookies["di-persistent-session-id"],
    sessionId: event.headers["session-id"] ?? gsCookieParts[0],
    clientSessionId: event.headers["client-session-id"] ?? gsCookieParts[1],
    userLanguage: event.headers["user-language"] ?? cookies["lng"],
    sourceIp:
      event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
      event.requestContext.identity.sourceIp,
    txmaAuditEncoded: event.headers["txma-audit-encoded"],
    userAgent: event.headers["user-agent"],
  };
};
