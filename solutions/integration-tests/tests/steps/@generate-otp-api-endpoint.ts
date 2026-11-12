import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";
import * as v from "valibot";

const { When, Then } = bdd;

const generateOTPEndpointPath = "/generate-otp";

const otpResponseSchema = v.object({
  otp: v.pipe(v.string(), v.regex(/^\d{6}$/)),
  expiresAt: v.number(),
});

const makeGenerateOTPRequest = async (
  publicSubjectId: string,
  body?: object,
) => {
  const baseUrl = await getApiBaseUrl();
  const requestedAt = Math.floor(Date.now() / 1000);
  const response = await fetch(
    `${baseUrl}${generateOTPEndpointPath}/${publicSubjectId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : null,
    },
  );
  return { response, requestedAt };
};

const assertValidOTPResponse = async (
  { response, requestedAt }: Awaited<ReturnType<typeof makeGenerateOTPRequest>>,
  expiresIn = 900,
) => {
  expect(response.status).toBe(200);
  const json = v.parse(otpResponseSchema, await response.json());
  expect(json.expiresAt).toBeGreaterThanOrEqual(requestedAt + expiresIn);
  expect(json.expiresAt).toBeLessThanOrEqual(requestedAt + expiresIn + 5);
};

When(
  "I make a valid request to the generate OTP endpoint",
  async ({ scenarioData }) => {
    scenarioData["generateOTPResponse"] = await makeGenerateOTPRequest(
      scenarioData.id,
      { source: "account-delete" },
    );
  },
);

When(
  "I make an invalid request to the generate OTP endpoint",
  async ({ scenarioData }) => {
    scenarioData["generateOTPResponse"] = await makeGenerateOTPRequest(
      scenarioData.id,
    );
  },
);

When(
  "I make enough requests to the generate OTP endpoint to trigger a TooManyOTPsRequested lockout",
  async ({ scenarioData }) => {
    const body = {
      source: "account-delete",
      reissueUnusedUnexpiredOTP: false,
      maxAllowedBeforeLockout: { count: 2, window: 900 },
      lockoutDuration: 900,
    };
    await assertValidOTPResponse(
      await makeGenerateOTPRequest(scenarioData.id, body),
    );
    await assertValidOTPResponse(
      await makeGenerateOTPRequest(scenarioData.id, body),
    );
    scenarioData["generateOTPResponse"] = await makeGenerateOTPRequest(
      scenarioData.id,
      body,
    );
  },
);

Then(
  "the generate OTP response has status 200 and contains an OTP and expiresAt",
  async ({ scenarioData }) => {
    await assertValidOTPResponse(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      scenarioData["generateOTPResponse"] as Awaited<
        ReturnType<typeof makeGenerateOTPRequest>
      >,
    );
  },
);

Then(
  "the generate OTP response has status 400 and code {int}",
  async ({ scenarioData }, code: number) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { response } = scenarioData["generateOTPResponse"] as Awaited<
      ReturnType<typeof makeGenerateOTPRequest>
    >;
    expect(response.status).toBe(400);
    expect(
      v.safeParse(v.object({ code: v.literal(code) }), await response.json())
        .success,
    ).toBe(true);
  },
);
