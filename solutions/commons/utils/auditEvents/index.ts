import type { APIGatewayProxyEvent } from "aws-lambda";
import { getSqsClient } from "../awsClient/sqsClient/index.js";
import assert from "node:assert";
import { getPropsFromAPIGatewayEvent } from "../getPropsFromAPIGatewayEvent/index.js";
import { merge } from "ts-deepmerge";

const NO_VALUE = "NO_VALUE";

interface EventInstanceBase {
  event_name: string;
  client_id: string;
  user_id: string;
  email: string;
}

// TODO add real event types here
type EventInstance =
  | (EventInstanceBase & {
      event_name: "TODO1";
    })
  | (EventInstanceBase & {
      event_name: "TODO2";
    });

const buildEvent = (
  event: EventInstance,
  apiGatewayProxyEvent: APIGatewayProxyEvent,
): {
  timestamp: number;
  event_timestamp_ms: number;
  event_timestamp_ms_formatted: string;
  component_id: "AMC";
  user: {
    session_id: string;
    persistent_session_id: string;
    ip_address: string;
    govuk_signin_journey_id: string;
  };
  restricted?:
    | {
        device_information?: {
          encoded: string;
        };
        [key: string]: unknown;
      }
    | undefined;
} => {
  const now = new Date();
  const propsFromEvent = getPropsFromAPIGatewayEvent(apiGatewayProxyEvent);

  return merge(
    {
      timestamp: Math.floor(now.getTime() / 1000),
      event_timestamp_ms: now.getTime(),
      event_timestamp_ms_formatted: now.toISOString(),
      component_id: "AMC" as const,
      user: {
        session_id: propsFromEvent.sessionId ?? NO_VALUE,
        persistent_session_id: propsFromEvent.persistentSessionId ?? NO_VALUE,
        ip_address: propsFromEvent.sourceIp,
        govuk_signin_journey_id: propsFromEvent.clientSessionId ?? NO_VALUE,
      },
      ...(propsFromEvent.txmaAuditEncoded === undefined
        ? {}
        : {
            restricted: {
              device_information: {
                encoded: propsFromEvent.txmaAuditEncoded,
              },
            },
          }),
    },
    event,
  );
};

export const sendAuditEvent = async (
  event: EventInstance,
  apiGatewayProxyEvent: APIGatewayProxyEvent,
) => {
  assert.ok(process.env["AUDIT_EVENTS_QUEUE_URL"]);

  const builtEvent = buildEvent(event, apiGatewayProxyEvent);

  const sqsClient = getSqsClient();
  await sqsClient.sendMessage({
    QueueUrl: process.env["AUDIT_EVENTS_QUEUE_URL"],
    MessageBody: JSON.stringify(builtEvent),
  });
};
