import type {
  SQSEvent,
  SQSBatchResponse,
  SQSBatchItemFailure,
  SQSRecord,
} from "aws-lambda";
import * as v from "valibot";
import { NotifyClient } from "notifications-node-client";
import { randomUUID } from "node:crypto";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { logger } from "../../../commons/utils/logger/index.js";
import { metrics } from "../../../commons/utils/metrics/index.js";
// notifications-node-client uses axios under the hood so we have to rely on it here
// eslint-disable-next-line depend/ban-dependencies
import { isAxiosError } from "axios";
import {
  messageSchema,
  NotificationType,
} from "../../../commons/utils/notifications/index.js";
import { mockEmailAddress } from "../../../commons/utils/constants.js";

type Personalisation = Record<string, string>;

const addSendNotificationFailedMetric = (failureReason: string) => {
  metrics.addMetadata("SendNotificationFailedReason", failureReason);
  metrics.addMetric("SendNotificationFailed", MetricUnit.Count, 1);
};

if (!process.env["NOTIFY_API_KEY_SECRET_ARN"]) {
  const errorName = "env_var_NOTIFY_API_KEY_SECRET_ARN_is_undefined";
  addSendNotificationFailedMetric(errorName);
  throw new Error(
    JSON.stringify({
      msg: errorName,
    }),
  );
}

const notifyApiKeySecretArn = process.env["NOTIFY_API_KEY_SECRET_ARN"];

let notifyApiKey: Awaited<ReturnType<typeof getSecret>>;
try {
  notifyApiKey = await getSecret(notifyApiKeySecretArn);
} catch (error) {
  const errorName = "error_getting_notify_api_key_secret";
  addSendNotificationFailedMetric(errorName);
  throw new Error(
    JSON.stringify({
      msg: errorName,
      error,
    }),
    { cause: error },
  );
}

if (!notifyApiKey) {
  const errorName = "notify_api_key_is_undefined";
  addSendNotificationFailedMetric(errorName);
  throw new Error(
    JSON.stringify({
      msg: errorName,
      notifyApiKeySecretArn,
    }),
  );
}

if (
  typeof notifyApiKey !== "string" // pragma: allowlist secret
) {
  const errorName = "notify_api_key_is_not_a_string";
  addSendNotificationFailedMetric(errorName);
  throw new Error(
    JSON.stringify({
      msg: errorName,
      notifyApiKeySecretArn,
    }),
  );
}

const notifyTemplateIDsSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.record(v.enum(NotificationType), v.string()),
);

const templateIds = v.safeParse(
  notifyTemplateIDsSchema,
  process.env["NOTIFY_TEMPLATE_IDS"],
);

if (!templateIds.success) {
  const errorName = "invalid_template_ids_format";
  addSendNotificationFailedMetric(errorName);
  throw new Error(
    JSON.stringify({
      msg: errorName,
      issues: templateIds.issues,
    }),
  );
}

const notifyTemplateIds = templateIds.output;

const processNotification = async (
  record: SQSRecord,
  batchItemFailures: SQSBatchItemFailure[],
) => {
  try {
    const messageParsed = v.safeParse(
      v.pipe(v.string(), v.parseJson(), messageSchema),
      record.body,
    );

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
      personalisation: Personalisation;
      optionalContentSwitches: Record<string, boolean>;
    } = messageParsed.output;

    metrics.addDimensions({ notificationType: message.notificationType });
    logger.appendKeys({ notificationType: message.notificationType });

    const templateId = notifyTemplateIds[message.notificationType];

    if (!templateId) {
      const errorName = "template_id_not_found";
      logger.error(errorName, {
        messageId: record.messageId,
      });
      addSendNotificationFailedMetric(errorName);
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }

    let sendResult: Awaited<
      ReturnType<InstanceType<typeof NotifyClient>["sendEmail"]>
    >;
    try {
      let notifyClient: InstanceType<typeof NotifyClient>;

      if (
        message.emailAddress === mockEmailAddress &&
        process.env["NOTIFY_STUB_URL"]
      ) {
        notifyClient = new NotifyClient(
          process.env["NOTIFY_STUB_URL"],
          notifyApiKey,
        );
      } else {
        notifyClient = new NotifyClient(notifyApiKey);
      }

      sendResult = await notifyClient.sendEmail(
        templateId,
        message.emailAddress,
        {
          personalisation: {
            ...message.personalisation,
            ...Object.fromEntries(
              Object.entries(message.optionalContentSwitches).map(
                ([key, value]) => [key, value ? "yes" : "no"],
              ),
            ),
          },
          reference: randomUUID(),
        },
      );
    } catch (error) {
      if (isAxiosError(error)) {
        const errorName = "unable_to_send_notification";
        logger.error(errorName, {
          messageId: record.messageId,
          status: error.response?.status,
          statusText: error.response?.statusText,
          details: error.response?.data,
        });
        addSendNotificationFailedMetric(errorName);
      } else {
        const errorName = "unable_to_send_notification_due_to_an_unknown_error";
        logger.error(errorName, {
          messageId: record.messageId,
          details: error instanceof Error ? error.message : undefined,
        });
        addSendNotificationFailedMetric(errorName);
      }
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }

    logger.info("notification_sent", {
      messageId: record.messageId,
      id: sendResult.data.id,
      reference: sendResult.data.reference,
    });
    metrics.addMetric("SendNotificationSucceeded", MetricUnit.Count, 1);
  } catch (error) {
    const errorName = "unknown_error";
    logger.error(errorName, {
      messageId: record.messageId,
      error,
    });
    addSendNotificationFailedMetric(errorName);
    batchItemFailures.push({ itemIdentifier: record.messageId });
    return;
  }
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  await Promise.allSettled(
    event.Records.map((record) =>
      processNotification(record, batchItemFailures),
    ),
  );

  logger.resetKeys();
  metrics.publishStoredMetrics();

  return {
    batchItemFailures,
  };
};
