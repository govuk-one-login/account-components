import type { APIGatewayProxyEvent } from "aws-lambda";

export const getTxmaAuditEncodedFromEvent = (event?: APIGatewayProxyEvent) => {
  return event?.headers["txma-audit-encoded"];
};
