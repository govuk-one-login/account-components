import { test as base, createBdd } from "playwright-bdd";
import { env } from "../../env.js";
import type { UUID } from "node:crypto";
import { randomUUID } from "node:crypto";

export const test = base.extend<
  {
    skips: undefined;
    fails: undefined;
    scenarioData: Record<string, unknown>;
  },
  {
    featureData: {
      id: UUID;
      [key: string]: unknown;
    };
  }
>({
  skips: [
    async ({ $test, $tags, isMobile }, use) => {
      $test.skip(
        ($tags.includes("@skipMobile") && isMobile) ||
          ($tags.includes("@skipDesktop") && !isMobile) ||
          $tags.includes(`@skipTarget-${env.TEST_TARGET}`) ||
          ($tags.includes(`@skipPreDeploy`) &&
            env.PRE_OR_POST_DEPLOY == "pre") ||
          ($tags.includes(`@skipPostDeploy`) &&
            env.PRE_OR_POST_DEPLOY == "post"),
      );

      await use(undefined);
    },
    { auto: true },
  ],

  fails: [
    async ({ $test, $tags, isMobile }, use) => {
      $test.fail(
        ($tags.includes("@failMobile") && isMobile) ||
          ($tags.includes("@failDesktop") && !isMobile) ||
          $tags.includes(`@failTarget-${env.TEST_TARGET}`),
      );

      await use(undefined);
    },
    { auto: true },
  ],

  javaScriptEnabled: async ({ $tags }, use) => {
    await use(!$tags.includes("@noJs"));
  },

  scenarioData: async (_, use) => {
    await use({});
  },

  featureData: [
    async (_, use) => {
      await use({
        id: randomUUID(),
      });
    },
    { scope: "worker" },
  ],
});

export const bdd = createBdd(test);
