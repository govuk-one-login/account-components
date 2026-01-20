import { bdd } from "./fixtures.js";

const { Given } = bdd;

Given("I set the nonce to the feature ID", async ({ page, featureData }) => {
  await page
    .getByRole("textbox", {
      name: /^Nonce/,
    })
    .fill(featureData.id);
});
