import { bdd } from "./fixtures.js";

const { Given } = bdd;

Given("I enter the correct verification code", async ({ page }) => {
  await page.getByLabel("TODO code").fill("123456");
});

Given("I enter my password", async ({ page }) => {
  await page.getByLabel("TODO password").fill("pa55w0rd!");
});
