import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { bdd } from "./fixtures.js";

const { Given, Then } = bdd;

async function submitFormWithModifiedCsrf(
  page: Page,
  csrfValue: string | null,
): Promise<number> {
  if (csrfValue === null) {
    await page.locator('input[name="_csrf"]').evaluate((el) => {
      el.remove();
    });
  } else {
    await page.locator('input[name="_csrf"]').evaluate((el, value) => {
      el.setAttribute("value", value);
    }, csrfValue);
  }

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: "Go to next step", exact: true }).click(),
  ]);

  return response.status();
}

Given(
  "I tamper with the CSRF token and submit the form",
  async ({ page, scenarioData }) => {
    scenarioData["csrfResponseStatus"] = await submitFormWithModifiedCsrf(
      page,
      "invalid-csrf-token",
    );
  },
);

Given(
  "I remove the CSRF token and submit the form",
  async ({ page, scenarioData }) => {
    scenarioData["csrfResponseStatus"] = await submitFormWithModifiedCsrf(
      page,
      null,
    );
  },
);

Then(
  "the response status code should be {int}",
  async ({ scenarioData }, statusCode: number) => {
    expect(scenarioData["csrfResponseStatus"]).toBe(statusCode);
  },
);
