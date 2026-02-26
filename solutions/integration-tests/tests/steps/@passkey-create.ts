import { bdd } from "./fixtures.js";
import type { Protocol } from "devtools-protocol";
import * as yaml from "yaml";

const { Given } = bdd;

Given(
  "I click the {string} button to continue to create passkey journey",
  async ({ page }, name: string) => {
    const response = page.waitForResponse(page.url());
    await page.getByRole("button", { name, exact: true }).click();
    await response;
  },
);

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
          ...options,
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
