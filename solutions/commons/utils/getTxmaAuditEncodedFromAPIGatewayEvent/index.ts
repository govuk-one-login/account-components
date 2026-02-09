import type { APIGatewayProxyEvent } from "aws-lambda";

export const getTxmaAuditEncodedFromAPIGatewayEvent = (
  event?: APIGatewayProxyEvent,
) => {
  return event?.headers["txma-audit-encoded"];
};
