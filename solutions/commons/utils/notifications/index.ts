import * as v from "valibot";
import { getSqsClient } from "../awsClient/sqsClient/index.js";
import assert from "node:assert";

export enum NotificationType {
  CREATE_PASSKEY_WITH_PASSKEY_NAME = "CREATE_PASSKEY_WITH_PASSKEY_NAME",
  CREATE_PASSKEY_WITHOUT_PASSKEY_NAME = "CREATE_PASSKEY_WITHOUT_PASSKEY_NAME",
}

export const messageSchema = v.variant("notificationType", [
  v.pipe(
    v.object({
      notificationType: v.literal(
        NotificationType.CREATE_PASSKEY_WITH_PASSKEY_NAME,
      ),
      emailAddress: v.pipe(v.string(), v.email()),
      passkeyName: v.string(),
    }),
    v.transform((input) => {
      return {
        emailAddress: input.emailAddress,
        notificationType: input.notificationType,
        personalisation: {
          passkey_name: input.passkeyName,
        },
        optionalContentSwitches: {},
      };
    }),
  ),
  v.pipe(
    v.object({
      notificationType: v.literal(
        NotificationType.CREATE_PASSKEY_WITHOUT_PASSKEY_NAME,
      ),
      emailAddress: v.pipe(v.string(), v.email()),
    }),
    v.transform((input) => {
      return {
        emailAddress: input.emailAddress,
        notificationType: input.notificationType,
        personalisation: {},
        optionalContentSwitches: {},
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
