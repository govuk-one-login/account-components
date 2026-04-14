import type { APIGatewayProxyEvent } from "aws-lambda";
import { getSqsClient } from "../awsClient/sqsClient/index.js";
import assert from "node:assert";
import { getPropsFromAPIGatewayEvent } from "../getPropsFromAPIGatewayEvent/index.js";
import { merge } from "ts-deepmerge";
import type { Events } from "@govuk-one-login/event-catalogue";
import type { OmitFromNested } from "../commonTypes.js";

type OmitAutomaticallyAddedEventProps<T> = Omit<
  T,
  | "timestamp"
  | "event_timestamp_ms"
  | "event_timestamp_ms_formatted"
  | "component_id"
  | "user"
  | "restricted"
> &
  OmitFromNested<
    T,
    "user",
    | "session_id"
    | "persistent_session_id"
    | "ip_address"
    | "govuk_signin_journey_id"
  > &
  OmitFromNested<T, "restricted.device_information", "encoded">;

type EventName = keyof Events;

type Event<T extends EventName> = OmitAutomaticallyAddedEventProps<
  Events[T] & {
    event_name: T;
  }
>;

const buildEvent = <T extends EventName>(
  event: Event<T>,
  apiGatewayProxyEvent: APIGatewayProxyEvent,
) => {
  const now = new Date();
  const propsFromEvent = getPropsFromAPIGatewayEvent(apiGatewayProxyEvent);

  return merge(
    {
      timestamp: Math.floor(now.getTime() / 1000),
      event_timestamp_ms: now.getTime(),
      event_timestamp_ms_formatted: now.toISOString(),
      component_id: "AMC" as const,
      user: {
        session_id: propsFromEvent.sessionId,
        persistent_session_id: propsFromEvent.persistentSessionId,
        ip_address: propsFromEvent.sourceIp,
        govuk_signin_journey_id: propsFromEvent.clientSessionId,
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

export const sendAuditEvent = async <T extends EventName = never>(
  ...[event, apiGatewayProxyEvent]: [T] extends [never]
    ? never
    : [event: NoInfer<Event<T>>, apiGatewayProxyEvent: APIGatewayProxyEvent]
) => {
  assert.ok(process.env["AUDIT_EVENTS_QUEUE_URL"]);

  const builtEvent = buildEvent<T>(event, apiGatewayProxyEvent);

  const sqsClient = getSqsClient();
  await sqsClient.sendMessage({
    QueueUrl: process.env["AUDIT_EVENTS_QUEUE_URL"],
    MessageBody: JSON.stringify(builtEvent),
  });
};
