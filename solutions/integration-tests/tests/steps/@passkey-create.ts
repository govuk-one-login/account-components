import { bdd } from "./fixtures.js";
import type { Protocol } from "devtools-protocol";
import * as yaml from "yaml";
import { notificationSent } from "../../utils/notificationSent.js";
import assert from "node:assert";
import { expect } from "@playwright/test";
import * as v from "valibot";
import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";
import { getSsmClient } from "../../utils/ssmClient.js";
import { queueMessageExists } from "../../utils/queueMessageExists.js";

const { Given, Then } = bdd;

Given(
  "I have an authenticator with the following options:",
  async ({ scenarioData }, optionsYaml: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const options: Partial<Protocol.WebAuthn.VirtualAuthenticatorOptions> =
      yaml.parse(optionsYaml);

    const authenticator = await scenarioData.cdpSession.send(
      "WebAuthn.addVirtualAuthenticator",
      {
        options: {
          protocol: "ctap2",
          transport: "internal",
          ...Object.fromEntries(Object.entries(options)),
        },
      },
    );
    scenarioData.authenticatorIds.push(authenticator.authenticatorId);
  },
);

Given("I have no authenticators", async ({ scenarioData }) => {
  await Promise.all(
    scenarioData.authenticatorIds.map((authenticatorId) => {
      return scenarioData.cdpSession.send(
        "WebAuthn.removeVirtualAuthenticator",
        {
          authenticatorId,
        },
      );
    }),
  );
  scenarioData.authenticatorIds = [];
});

Then("I receive an email about my new passkey", async ({ scenarioData }) => {
  assert.ok(scenarioData.uniqueUser, "scenarioData.uniqueUser is not set");

  const passkeyName = "Chromium Virtual Authenticator (browser dev tools)";

  expect(
    await notificationSent({
      emailAddress: scenarioData.uniqueUser.email,
      sqsMessageParams: {
        notificationType: "CREATE_PASSKEY_WITH_DISPLAY_NAME",
        otherProperties: {
          passkeyName: v.literal(passkeyName),
        },
      },
      notifyRequestParams: {
        templateId: "fb385d74-ac28-466d-8695-3d8a732a4cf8",
        personalisation: {
          passkey_name: passkeyName,
        },
      },
    }),
  ).toBe(true);
});

Then(
  "a AMC_PASSKEY_ENROLMENT_SUCCESSFUL audit event is sent",
  async ({ scenarioData }) => {
    const ssmProvider = new SSMProvider({ awsSdkV3Client: getSsmClient() });
    const txmaQueueUrl = await ssmProvider.get(
      "/tests/TxMASQSProducerAuditEventQueueUrl",
      { maxAge: 300 },
    );
    assert.ok(txmaQueueUrl);

    expect(
      await queueMessageExists(txmaQueueUrl, (messageBody) => {
        assert.ok(scenarioData.uniqueUser);

        return v.safeParse(
          v.object({
            event_name: v.literal("AMC_PASSKEY_ENROLMENT_SUCCESSFUL"),
            user: v.object({
              email: v.literal(scenarioData.uniqueUser.email),
              user_id: v.literal(scenarioData.uniqueUser.commonSubjectId),
            }),
            extensions: v.object({
              passkey: v.object({
                passkey_aaguid: v.literal(
                  "01020304-0506-0708-0102-030405060708",
                ),
              }),
            }),
          }),
          messageBody,
        ).success;
      }),
    ).toBe(true);
  },
);
