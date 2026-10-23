import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const lockoutStatusEndpointPath = "/lockout-status";

When(
  "I make a request to the lockout status endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${lockoutStatusEndpointPath}/TODO`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      TODO: "TODO",
    });
  },
);
