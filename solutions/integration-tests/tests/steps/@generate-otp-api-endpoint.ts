import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";

const { When } = bdd;

const generateOTPEndpointPath = "/generate-otp";

When(
  "I make a request to the generate OTP endpoint then the response is as expected",
  async () => {
    const response = await fetch(
      `${await getApiBaseUrl()}${generateOTPEndpointPath}/TODO`,
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
