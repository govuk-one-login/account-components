import type { APIGatewayProxyEvent } from "aws-lambda";
import { parse } from "cookie";

export const getUsefulPropsForLoggingFromEvent = (
  event?: APIGatewayProxyEvent,
) => {
  if (!event) return {};

  const cookies = parse(event.headers["cookie"] ?? "");
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
      event.headers["x-forwarded-for"] ??
      event.requestContext.identity.sourceIp,
    txmaAuditEncoded: event.headers["txma-audit-encoded"],
  };
};
