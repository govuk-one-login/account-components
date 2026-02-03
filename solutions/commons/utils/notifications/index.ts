import * as v from "valibot";
import { getSqsClient } from "../awsClient/sqsClient/index.js";
import assert from "node:assert";

export enum NotificationType {
  TODO = "TODO",
}

export const messageSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.variant("notificationType", [
    v.pipe(
      v.object({
        notificationType: v.literal(NotificationType.TODO),
        emailAddress: v.pipe(v.string(), v.email()),
      }),
      v.transform((input) => {
        return {
          emailAddress: input.emailAddress,
          notificationType: input.notificationType,
          personalisation: {},
        };
      }),
    ),
  ]),
);

export const sendNotification = async (
  message: v.InferOutput<typeof messageSchema>,
) => {
  assert.ok(process.env["NOTIFICATIONS_QUEUE_URL"]);

  const sqsClient = getSqsClient();
  await sqsClient.sendMessage({
    QueueUrl: process.env["NOTIFICATIONS_QUEUE_URL"],
    MessageBody: JSON.stringify(message),
  });
};
