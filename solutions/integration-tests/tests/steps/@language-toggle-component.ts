import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";

const { Given, Then } = bdd;

Then("the language toggle shows", async ({ page }) => {
  await expect(page.locator("nav.language-select")).toBeVisible();
});

Given(
  "I click the {string} language link",
  async ({ page }, linkLabel: string) => {
    const languageLink = page.locator(".language-select__list-item a", {
      hasText: linkLabel,
    });
    await languageLink.click();
  },
);
