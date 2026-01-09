import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getAccountManagementUrl } from "../../utils/getAccountManagementUrl.js";

const { Given, Then } = bdd;

Then("the header logo links to the GOV.UK homepage", async ({ page }) => {
  await expect(
    page.locator("header").getByRole("link", { name: "GOV.UK", exact: true }),
  ).toHaveAttribute("href", "https://www.gov.uk/");
});

Then(
  "the header logo links to the account management Your Services page",
  async ({ page }) => {
    await expect(
      page
        .locator("header")
        .getByRole("link", { name: "GOV.UK One Login", exact: true }),
    ).toHaveAttribute("href", `${getAccountManagementUrl()}/your-services`);
  },
);

Then("the account navigation is not present", async ({ page }) => {
  await expect(
    page.getByRole("navigation", { name: "Account navigation", exact: true }),
  ).toHaveCount(0);
});

Then(
  "the account navigation is present and contains the expected links",
  async ({ page }) => {
    const nav = page.getByRole("navigation", {
      name: "Account navigation",
      exact: true,
    });

    await expect(
      nav.getByRole("link", { name: "Your services", exact: true }),
    ).toHaveAttribute("href", `${getAccountManagementUrl()}/your-services`);
    await expect(
      nav.getByRole("link", { name: "Security", exact: true }),
    ).toHaveAttribute("href", `${getAccountManagementUrl()}/security`);
  },
);

Then("the sign out button is not present in the header", async ({ page }) => {
  await expect(
    page
      .locator("header")
      .getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
});

Given("I click the sign out button in the header", async ({ page }) => {
  await page
    .locator("header")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
});
