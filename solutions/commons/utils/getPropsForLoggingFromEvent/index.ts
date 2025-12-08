import type { APIGatewayProxyEvent } from "aws-lambda";
import { parse } from "cookie";

export const getPropsForLoggingFromEvent = (event?: APIGatewayProxyEvent) => {
  if (!event) return {};

  const cookies = parse(event.headers["cookie"] ?? "");
  const gsCookie = cookies["gs"];
  const gsCookieParts = gsCookie ? gsCookie.split(".") : [];

  let props = {};
  props = addHeader(
    props,
    "persistentSessionId",
    event.headers["di-persistent-session-id"] ??
      cookies["di-persistent-session-id"],
  );
  props = addHeader(
    props,
    "sessionId",
    event.headers["session-id"] ?? gsCookieParts[0],
  );
  props = addHeader(
    props,
    "clientSessionId",
    event.headers["client-session-id"] ?? gsCookieParts[1],
  );
  props = addHeader(
    props,
    "userLanguage",
    event.headers["user-language"] ?? cookies["lng"],
  );
  props = addHeader(
    props,
    "sourceIp",
    event.headers["x-forwarded-for"] ?? event.requestContext.identity.sourceIp,
  );

  return props;
};

const addHeader = <T extends Record<string, string>>(
  props: T,
  header: string,
  value: string | undefined,
): T => {
  if (value && value.length > 0) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
      ...props,
      [header]: value,
    } as T;
  }
  return { ...props, [header]: undefined };
};
