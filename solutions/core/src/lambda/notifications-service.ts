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
import { getAppConfig } from "../../../commons/utils/getAppConfig/index.js";

type EmailAddress = string;
type Personalisation = Record<string, string>;
interface NotifyClientType {
  sendEmail: (
    templateId: string,
    emailAddress: EmailAddress,
    options: {
      personalisation: Personalisation;
      reference: string;
    },
  ) => Promise<unknown>;
}

const addSendNotificationFailedMetric = (failureReason: string) => {
  metrics.addDimension("SendNotificationFailedReason", failureReason);
  metrics.addMetric("SendNotificationFailed", MetricUnit.Count, 1);
};

let notifyClient: NotifyClientType | undefined = undefined;

const setUpNotifyClient = async (
  record: SQSRecord,
): Promise<NotifyClientType | undefined> => {
  console.log("MHTEST13");

  if (notifyClient) {
    return notifyClient;
  }

  console.log("MHTEST14");

  assert.ok(
    process.env["NOTIFY_API_KEY_SECRET_ARN"],
    "process.env.NOTIFY_API_KEY_SECRET_ARN is not defined",
  );
  console.log("MHTEST15");

  const notifyApiKeySecretArn = process.env["NOTIFY_API_KEY_SECRET_ARN"];
  const appConfig = await getAppConfig();

  console.log("MHTEST16");

  const notifyApiKey = await getSecret(notifyApiKeySecretArn, {
    maxAge: appConfig.notify_api_key_scret_max_age,
  });

  console.log("MHTEST17");

  if (!notifyApiKey) {
    const errorName = "notify_api_key_is_undefined";
    logger.error(errorName, {
      messageId: record.messageId,
      notifyApiKeySecretArn,
    });
    addSendNotificationFailedMetric(errorName);
    return;
  }
  console.log("MHTEST18");

  if (
    typeof notifyApiKey !== "string" // pragma: allowlist secret
  ) {
    const errorName = "notify_api_key_is_not_a_string";
    logger.error(errorName, {
      messageId: record.messageId,
      notifyApiKeySecretArn,
    });
    addSendNotificationFailedMetric(errorName);
    return;
  }
  console.log("MHTEST19");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  notifyClient = new NotifyClient(notifyApiKey);

  console.log("MHTEST20");

  return notifyClient;
};

const notifyTemplateIDsSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.record(v.enum(NotificationType), v.string()),
);
let notifyTemplateIds:
  | v.InferOutput<typeof notifyTemplateIDsSchema>
  | undefined = undefined;

const getNotifyTemplateIds = (
  record: SQSRecord,
): v.InferOutput<typeof notifyTemplateIDsSchema> | undefined => {
  console.log("MHTEST3");

  if (notifyTemplateIds) {
    return notifyTemplateIds;
  }

  console.log("MHTEST4");

  const templateIds = v.safeParse(
    notifyTemplateIDsSchema,
    process.env["NOTIFY_TEMPLATE_IDS"],
  );

  console.log("MHTEST5");

  if (!templateIds.success) {
    const errorName = "invalid_template_ids_format";
    logger.error(errorName, {
      messageId: record.messageId,
      issues: templateIds.issues,
    });
    addSendNotificationFailedMetric(errorName);
    return;
  }

  console.log("MHTEST6");

  notifyTemplateIds = templateIds.output;

  return notifyTemplateIds;
};

const processNotification = async (
  record: SQSRecord,
  batchItemFailures: SQSBatchItemFailure[],
) => {
  console.log("MHTEST2");

  try {
    const notifyTemplateIds = getNotifyTemplateIds(record);

    console.log("MHTEST7");

    if (!notifyTemplateIds) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }

    console.log("MHTEST8");

    const messageParsed = v.safeParse(
      v.pipe(v.string(), v.parseJson(), messageSchema),
      record.body,
    );
    console.log("MHTEST9");

    if (!messageParsed.success) {
      const errorName = "invalid_message_format";
      logger.error(errorName, {
        messageId: record.messageId,
      });
      addSendNotificationFailedMetric(errorName);
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }
    console.log("MHTEST10");

    const message: {
      emailAddress: EmailAddress;
      notificationType: NotificationType;
      personalisation: Personalisation;
    } = messageParsed.output;

    const templateId = notifyTemplateIds[message.notificationType];

    console.log("MHTEST11");

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

    console.log("MHTEST12");

    const notifyClient = await setUpNotifyClient(record);

    console.log("MHTEST21");

    if (!notifyClient) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }

    console.log("MHTEST22");
    console.log("MHTEST22b");

    let sendResult: unknown;
    try {
      sendResult = await notifyClient.sendEmail(
        templateId,
        message.emailAddress,
        {
          personalisation: message.personalisation,
          reference: randomUUID(),
        },
      );
      console.log("MHTEST23");
    } catch (error) {
      console.log("MHTEST24");

      if (isAxiosError(error)) {
        console.log("MHTEST25");

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
        console.log("MHTEST26");

        const errorName = "unable_to_send_notification_due_to_an_unknown_error";
        logger.error(errorName, {
          messageId: record.messageId,
          notificationType: message.notificationType,
          details: error instanceof Error ? error.message : undefined,
        });
        addSendNotificationFailedMetric(errorName);
      }
      console.log("MHTEST27");

      batchItemFailures.push({ itemIdentifier: record.messageId });
      return;
    }
    console.log("MHTEST28");

    const notifySuccessSchema = v.object({
      data: v.object({
        id: v.string(),
        reference: v.nullish(v.string()),
      }),
    });

    console.log("MHTEST29");

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

    console.log("MHTEST30");

    logger.info("notification_sent", {
      messageId: record.messageId,
      id: resultParsed.output.data.id,
      reference: resultParsed.output.data.reference,
      notificationType: message.notificationType,
    });
    metrics.addMetric("SendNotificationSucceeded", MetricUnit.Count, 1);

    console.log("MHTEST30");
  } catch (error) {
    console.log("MHTEST31");

    const errorName = "unknown_error";
    logger.error(errorName, {
      messageId: record.messageId,
      error,
    });
    addSendNotificationFailedMetric(errorName);
    batchItemFailures.push({ itemIdentifier: record.messageId });
    return;
  }
  console.log("MHTEST32");
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  console.log("MHTEST1");

  await Promise.allSettled(
    event.Records.map((record) =>
      processNotification(record, batchItemFailures),
    ),
  );

  console.log("MHTEST33");

  logger.resetKeys();
  metrics.captureColdStartMetric();
  metrics.publishStoredMetrics();

  console.log("MHTEST34");

  return {
    batchItemFailures,
  };
};
