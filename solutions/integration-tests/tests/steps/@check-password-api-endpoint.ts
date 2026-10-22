import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const checkPasswordEndpointPath = "/check-password";

When(
  "I make a request to the check password endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${checkPasswordEndpointPath}/TODO`,
      {
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      TODO: "TODO",
    });
  },
);
