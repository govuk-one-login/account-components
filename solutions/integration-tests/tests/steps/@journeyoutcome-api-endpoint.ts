import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const journeyOutcomeEndpointPath = "/journeyoutcome";

When(
  "I make an invalid request to the journey outcome endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${journeyOutcomeEndpointPath}`,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "E4006",
    });
  },
);
