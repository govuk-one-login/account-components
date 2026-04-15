import type { APIGatewayProxyEvent } from "aws-lambda";
import { getSqsClient } from "../awsClient/sqsClient/index.js";
import assert from "node:assert";
import { getPropsFromAPIGatewayEvent } from "../getPropsFromAPIGatewayEvent/index.js";
import type { createEvent } from "@govuk-one-login/event-catalogue-utils";

export const getCommonAuditEventProps = (
  apiGatewayProxyEvent?: APIGatewayProxyEvent,
) => {
  const now = new Date();
  const propsFromEvent = apiGatewayProxyEvent
    ? getPropsFromAPIGatewayEvent(apiGatewayProxyEvent)
    : undefined;

  return {
    timestamp: Math.floor(now.getTime() / 1000),
    event_timestamp_ms: now.getTime(),
    event_timestamp_ms_formatted: now.toISOString(),
    component_id: "AMC" as const,
    user: {
      session_id: propsFromEvent?.sessionId,
      persistent_session_id: propsFromEvent?.persistentSessionId,
      ip_address: propsFromEvent?.sourceIp,
      govuk_signin_journey_id: propsFromEvent?.clientSessionId,
    },
    ...(typeof propsFromEvent?.txmaAuditEncoded === "undefined"
      ? {}
      : {
          restricted: {
            device_information: {
              encoded: propsFromEvent.txmaAuditEncoded,
            },
          },
        }),
  };
};

export const sendAuditEvent = async (event: ReturnType<typeof createEvent>) => {
  assert.ok(process.env["AUDIT_EVENTS_QUEUE_URL"]);

  const sqsClient = getSqsClient();
  await sqsClient.sendMessage({
    QueueUrl: process.env["AUDIT_EVENTS_QUEUE_URL"],
    MessageBody: JSON.stringify(event),
  });
};
