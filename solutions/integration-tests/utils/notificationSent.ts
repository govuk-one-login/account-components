import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import { env } from "../env.js";
import { queueMessageExists } from "./queueMessageExists.js";
import { stubsOutputExists } from "./stubsOutputExists.js";
import assert from "node:assert";
import * as v from "valibot";

export const notificationSent = async ({
  emailAddress,
  sqsMessageParams: { notificationType, ...sqsMessageParams },
  notifyRequestParams: { templateId, personalisation },
}: {
  emailAddress: string;
  sqsMessageParams: {
    notificationType: string;
    otherProperties?: v.ObjectEntries;
  };
  notifyRequestParams: {
    templateId: string;
    personalisation?: Record<string, v.Literal>;
  };
}): Promise<true> => {
  try {
    if (env.TEST_TARGET === "local") {
      const notificationsQueueUrl = await getParameter(
        "/tests/NotificationsQueueUrl",
        {
          maxAge: 300,
        },
      );
      assert.ok(notificationsQueueUrl);

      return await queueMessageExists(notificationsQueueUrl, (messageBody) => {
        return v.safeParse(
          v.object({
            body: v.object({
              emailAddress: v.literal(emailAddress),
              notificationType: v.literal(notificationType),
              ...sqsMessageParams.otherProperties,
            }),
          }),
          messageBody,
        ).success;
      });
    } else {
      return await stubsOutputExists((output) => {
        return v.safeParse(
          v.object({
            body: v.object({
              email_address: v.literal(emailAddress),
              template_id: v.literal(templateId),
              personalisation:
                personalisation !== undefined
                  ? v.object(
                      Object.fromEntries(
                        Object.entries(personalisation).map(([key, value]) => [
                          key,
                          v.literal(value),
                        ]),
                      ),
                    )
                  : v.any(),
              method: v.literal("POST"),
              url: v.pipe(v.string(), v.endsWith("/v2/notifications/email")),
            }),
          }),
          output,
        ).success;
      });
    }
  } catch (error) {
    throw new Error(
      `Notification not found for email address ${emailAddress} with template ${notificationType}/${templateId}`,
      {
        cause: error,
      },
    );
  }
};
