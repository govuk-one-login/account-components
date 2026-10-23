import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const tokenEndpointPath = "/token";

When(
  "I make an invalid request to the token endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${tokenEndpointPath}`,
      {
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "E4001",
    });
  },
);
