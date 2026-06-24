import { bdd } from "./fixtures.js";

const { Given } = bdd;

Given("I enter an incorrect verification code", async ({ page }) => {
  await page.getByLabel("Enter the 6 digit code").fill("654321");
});

Given("I enter the correct verification code", async ({ page }) => {
  await page.getByLabel("Enter the 6 digit code").fill("123456");
});

Given("I enter my password", async ({ page }) => {
  await page.getByLabel("Enter your password").fill("pa55w0rd!");
});

Given("I enter an incorrect password", async ({ page }) => {
  await page.getByLabel("Enter your password").fill("wr0ngpa55w0rd!");
});
