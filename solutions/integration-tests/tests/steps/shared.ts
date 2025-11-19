import AxeBuilder from "@axe-core/playwright";
import { bdd } from "./fixtures.js";
import { expect } from "@playwright/test";
import assert from "node:assert";
import { getStubsUrl } from "../../utils/getStubsUrl.js";

const { Then, Given } = bdd;

const stubsUrl = getStubsUrl();

const pageNameToPath: Record<string, string> = {
  "Non-existent page": "/non-existent-page",
  Healthcheck: "/healthcheck",
  "Authorize error": "/authorize-error",
  "Testing journey - step 1": "/testing-journey/step-1",
  "Testing journey - enter password": "/testing-journey/enter-password",
  "Testing journey - confirmation": "/testing-journey/confirm",
};

Then("the page meets our accessibility standards", async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag22aa"])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

Given("I go to the {string} page", async ({ page }, pageName: string) => {
  assert.ok(pageNameToPath[pageName]);
  await page.goto(pageNameToPath[pageName]);
});

Given("I go to the journey initiator", async ({ page }) => {
  await page.goto(stubsUrl);
});

Given("I begin a {string} journey", async ({ page }, scope: string) => {
  const legend = page.locator('legend:has-text("Scopes")');
  const fieldset = page.locator("fieldset").filter({ has: legend });
  await fieldset.getByLabel(scope).check();
  await page
    .getByRole("button", { name: "Generate Request Object", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Start AMC Journey", exact: true })
    .click();
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
  async ({ page }, pageTitlePrefix: string) => {
    expect(await page.title()).toBe(`${pageTitlePrefix} - GOV.UK One Login`);
  },
);

Then("the page title is {string}", async ({ page }, pageTitle: string) => {
  expect(await page.title()).toBe(pageTitle);
});

Then("the page path is {string}", async ({ page }, pageName: string) => {
  expect(new URL(page.url()).pathname).toBe(pageNameToPath[pageName]);
});

Then("the page contains the text {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

Then("the page looks as expected", async ({ page }) => {
  expect(
    await page.screenshot({
      fullPage: true,
      quality: 50,
      type: "jpeg",
      mask: [page.locator("[data-test-mask]")],
    }),
  ).toMatchSnapshot();
});

Then("I click the browser's back button", async ({ page }) => {
  await page.goBack();
});
