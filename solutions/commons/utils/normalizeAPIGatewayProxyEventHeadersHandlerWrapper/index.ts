import type { APIGatewayProxyHandler } from "../interfaces.js";

export const normalizeAPIGatewayProxyEventHeadersHandlerWrapper = (
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler => {
  const wrappedHandler: APIGatewayProxyHandler = async (event, context) => {
    const normalizedHeaders: (typeof event)["headers"] = {};
    const normalizedMultiHeaders: (typeof event)["multiValueHeaders"] = {};

    for (const [key, value] of Object.entries(event.headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    for (const [key, value] of Object.entries(event.multiValueHeaders)) {
      const lowercaseKey = key.toLowerCase();

      const values = [
        ...(normalizedMultiHeaders[lowercaseKey] ?? []),
        ...(value ?? []),
      ];
      normalizedMultiHeaders[lowercaseKey] = values.length ? values : undefined;
    }

    const res = await handler(
      {
        ...event,
        headers: normalizedHeaders,
        multiValueHeaders: normalizedMultiHeaders,
      },
      context,
    );

    return res;
  };
  return wrappedHandler;
};
