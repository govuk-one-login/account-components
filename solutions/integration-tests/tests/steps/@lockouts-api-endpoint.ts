import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const lockoutsEndpointPath = "/lockouts";

When(
  "I make a request to the lockouts endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${lockoutsEndpointPath}/TODO`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      TODO: "TODO",
    });
  },
);
