import AxeBuilder from "@axe-core/playwright";
import { bdd } from "./fixtures";
import { expect } from "@playwright/test";
import assert from "node:assert";

const { Then, Given } = bdd;

const pageTitleToPath: Record<string, string> = {
  Healthcheck: "/healthcheck",
};

Then("the page meets our accessibility standards", async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag22aa"])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

Given("I go to the {string} page", async ({ page }, pageTitle: string) => {
  assert.ok(pageTitleToPath[pageTitle]);
  await page.goto(pageTitleToPath[pageTitle]);
});

Given("I click the {string} link", async ({ page }, linkLabel: string) => {
  await page.getByRole("link", { name: linkLabel, exact: true }).click();
});

Given("I click the {string} button", async ({ page }, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
});

Given("the page has finished loading", async ({ page }) => {
  // eslint-disable-next-line playwright/no-networkidle
  await page.waitForLoadState("networkidle");
});

Then(
  "the page title is prefixed with {string}",
  async ({ page }, pageTitle: string) => {
    expect(await page.title()).toBe(`${pageTitle} - GOV.UK One Login`);
  },
);

Then("the page title is {string}", async ({ page }, pageTitle: string) => {
  expect(await page.title()).toBe(pageTitle);
});

Then(
  "the page contains the text {string}",
  async ({ page }, content: string) => {
    await expect(page.getByText(content)).toBeVisible();
  },
);

Then("the page looks as expected", async ({ page }) => {
  expect(
    await page.screenshot({
      fullPage: true,
      quality: 25,
      type: "jpeg",
    }),
  ).toMatchSnapshot();
});
