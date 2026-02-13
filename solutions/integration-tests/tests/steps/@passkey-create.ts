import { bdd } from "./fixtures.js";
import type { Protocol } from "devtools-protocol";
import * as yaml from "yaml";

const { Given } = bdd;

Given(
  "I have an authenticator with the following options:",
  async ({ page }, optionsYaml: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const options: Partial<Protocol.WebAuthn.VirtualAuthenticatorOptions> =
      yaml.parse(optionsYaml);

    const client = await page.context().newCDPSession(page);
    await client.send("WebAuthn.enable");

    await client.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        ...options,
      },
    });
  },
);
