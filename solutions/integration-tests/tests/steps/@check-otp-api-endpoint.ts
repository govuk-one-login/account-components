import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const checkOTPEndpointPath = "/check-otp";

When(
  "I make a request to the check OTP endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${checkOTPEndpointPath}/TODO`,
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
