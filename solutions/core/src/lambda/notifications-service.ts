import type {
  SQSEvent,
  SQSBatchResponse,
  SQSBatchItemFailure,
  SQSRecord,
} from "aws-lambda";
import * as v from "valibot";
// @ts-expect-error - types aren't available
import { NotifyClient } from "notifications-node-client";
import { randomUUID } from "node:crypto";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import assert from "node:assert";
import { logger } from "../../../commons/utils/logger/index.js";
import { metrics } from "../../../commons/utils/metrics/index.js";
// notifications-node-client uses axios under the hood so we have to rely on it here
// eslint-disable-next-line depend/ban-dependencies
import { isAxiosError } from "axios";
import {
  messageSchema,
  NotificationType,
} from "../../../commons/utils/notifications/index.js";

const addSendNotificationFailedMetric = (failureReason: string) => {
  metrics.addDimension("SendNotificationFailedReason", failureReason);
  metrics.addMetric("SendNotificationFailed", MetricUnit.Count, 1);
};

const notifySuccessSchema = v.object({
  data: v.object({
    id: v.string(),
    reference: v.nullish(v.string()),
  }),
});

const templateIDsSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.record(v.enum(NotificationType), v.string()),
);

const notifyTemplateIds = v.parse(
  templateIDsSchema,
  process.env["NOTIFY_TEMPLATE_IDS"],
);

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let notifyClient: InstanceType<typeof NotifyClient> | undefined = undefined;

export const setUpNotifyClient = async (
  record: SQSRecord,
  batchItemFailures: SQSBatchItemFailure[],
) => {
  if (!notifyClient) {
    assert.ok(
      process.env["NOTIFY_API_KEY_SECRET_ARN"],
      "process.env.NOTIFY_API_KEY_SECRET_ARN is not defined",
    );
    const notifyApiKeySecretArn = process.env["NOTIFY_API_KEY_SECRET_ARN"];
    const notifyApiKey = await getSecret(notifyApiKeySecretArn, {
      maxAge: 900, // TODO get from config
    });

    if (!notifyApiKey) {
      const errorName = "notify_api_key_is_undefined";
      logger.error(errorName, {
        messageId: record.messageId,
        notifyApiKeySecretArn,
      });
      addSendNotificationFailedMetric(errorName);
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }
    if (
      typeof notifyApiKey !== "string" // pragma: allowlist secret
    ) {
      const errorName = "notify_api_key_is_not_a_string";
      logger.error(errorName, {
        messageId: record.messageId,
        notifyApiKeySecretArn,
      });
      addSendNotificationFailedMetric(errorName);
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    notifyClient = new NotifyClient(notifyApiKey);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return notifyClient;
};

export const processNotification = async (
  record: SQSRecord,
  batchItemFailures: SQSBatchItemFailure[],
) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const notifyClient = await setUpNotifyClient(record, batchItemFailures);

  const messageParsed = v.safeParse(messageSchema, record.body);
  if (!messageParsed.success) {
    const errorName = "invalid_message_format";
    logger.error(errorName, {
      messageId: record.messageId,
    });
    addSendNotificationFailedMetric(errorName);
    batchItemFailures.push({ itemIdentifier: record.messageId });
    return;
  }

  const message: {
    emailAddress: string;
    notificationType: NotificationType;
    personalisation: Record<string, string>;
  } = messageParsed.output;

  const templateId = notifyTemplateIds[message.notificationType];
  if (!templateId) {
    const errorName = "template_id_not_found";
    logger.error(errorName, {
      messageId: record.messageId,
      notificationType: message.notificationType,
    });
    addSendNotificationFailedMetric(errorName);
    batchItemFailures.push({ itemIdentifier: record.messageId });
    return;
  }

  let sendResult: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    sendResult = await notifyClient.sendEmail(
      templateId,
      message.emailAddress,
      {
        personalisation: message.personalisation,
        reference: randomUUID(),
      },
    );
  } catch (error) {
    if (isAxiosError(error)) {
      const errorName = "unable_to_send_notification";
      logger.error(errorName, {
        messageId: record.messageId,
        notificationType: message.notificationType,
        status: error.response?.status,
        statusText: error.response?.statusText,
        details: error.response?.data,
      });
      addSendNotificationFailedMetric(errorName);
    } else {
      const errorName = "unable_to_send_notification_due_to_an_unknown_error";
      logger.error(errorName, {
        messageId: record.messageId,
        notificationType: message.notificationType,
        details: error instanceof Error ? error.message : undefined,
      });
      addSendNotificationFailedMetric(errorName);
    }
    batchItemFailures.push({ itemIdentifier: record.messageId });
    return;
  }

  const resultParsed = v.safeParse(notifySuccessSchema, sendResult);
  if (!resultParsed.success) {
    const errorName = "invalid_result_format";
    logger.error(errorName, {
      messageId: record.messageId,
      notificationType: message.notificationType,
    });
    addSendNotificationFailedMetric(errorName);
    batchItemFailures.push({ itemIdentifier: record.messageId });
    return;
  }

  logger.info("notification_sent", {
    messageId: record.messageId,
    id: resultParsed.output.data.id,
    reference: resultParsed.output.data.reference,
    notificationType: message.notificationType,
  });
  metrics.addMetric("SendNotificationSucceeded", MetricUnit.Count, 1);
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  await Promise.allSettled(
    event.Records.map((record) =>
      processNotification(record, batchItemFailures),
    ),
  );

  logger.resetKeys();
  metrics.captureColdStartMetric();
  metrics.publishStoredMetrics();

  return {
    batchItemFailures,
  };
};
