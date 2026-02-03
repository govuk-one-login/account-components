import * as v from "valibot";
import { getSqsClient } from "../awsClient/sqsClient/index.js";
import assert from "node:assert";

export enum NotificationType {
  GLOBAL_LOGOUT = "GLOBAL_LOGOUT",
}

export const messageSchema = v.variant("notificationType", [
  v.pipe(
    v.object({
      notificationType: v.literal(NotificationType.GLOBAL_LOGOUT),
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
]);

export const sendNotification = async (
  message: v.InferInput<typeof messageSchema>,
) => {
  assert.ok(process.env["NOTIFICATIONS_QUEUE_URL"]);

  const sqsClient = getSqsClient();
  await sqsClient.sendMessage({
    QueueUrl: process.env["NOTIFICATIONS_QUEUE_URL"],
    MessageBody: JSON.stringify(message),
  });
};
