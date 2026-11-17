import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";
import * as v from "valibot";

const { When } = bdd;

const generateOTPEndpointPath = "/generate-otp";

const Source = {
  "account-delete": "account-delete",
  "passkey-create": "passkey-create",
} as const;

const generateOTPResponseSchema = v.object({
  otp: v.string(),
  expiresAt: v.number(),
});

const errorResponseSchema = v.object({
  code: v.number(),
});

const makeRequest = async (
  publicSubjectId: string,
  body: Record<string, unknown>,
) => {
  const baseUrl = await getApiBaseUrl();
  return fetch(`${baseUrl}${generateOTPEndpointPath}/${publicSubjectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const defaultBody = { source: Source["account-delete"] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

When(
  "I run the generate OTP endpoint scenario",
  async ({ scenarioData, $test }) => {
    const publicSubjectId = scenarioData.id;

    await $test.step("Invalid requests", async () => {
      const invalidRequests = [
        makeRequest(publicSubjectId, {}),
        makeRequest(publicSubjectId, { source: "invalid-source" }),
        makeRequest(publicSubjectId, { ...defaultBody, expiresIn: 0 }),
        makeRequest(publicSubjectId, { ...defaultBody, expiresIn: 1.5 }),
        makeRequest(publicSubjectId, { ...defaultBody, lockoutDuration: 0 }),
        makeRequest(publicSubjectId, {
          ...defaultBody,
          lockoutDuration: 1.5,
        }),
        makeRequest(publicSubjectId, {
          ...defaultBody,
          maxAllowedBeforeLockout: { count: 0 },
        }),
        makeRequest(publicSubjectId, {
          ...defaultBody,
          maxAllowedBeforeLockout: { count: 1.5 },
        }),
        makeRequest(publicSubjectId, {
          ...defaultBody,
          maxAllowedBeforeLockout: { window: 0 },
        }),
        makeRequest(publicSubjectId, {
          ...defaultBody,
          maxAllowedBeforeLockout: { window: 1.5 },
        }),
      ];

      for (const invalidRequest of await Promise.all(invalidRequests)) {
        expect(invalidRequest.status).toBe(400);
        const body = v.parse(errorResponseSchema, await invalidRequest.json());
        expect(body.code).toBe(1001);
      }
    });

    const { otp: firstOtp, expiresAt: firstExpiresAt } = await $test.step(
      "Generate OTP: issues a new OTP expiring in ~900s",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await makeRequest(publicSubjectId, defaultBody);
        const after = Math.floor(Date.now() / 1000);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toMatch(/^\d{6}$/);
        expect(body.expiresAt).toBeGreaterThanOrEqual(before + 900);
        expect(body.expiresAt).toBeLessThanOrEqual(after + 900);
        return body;
      },
    );

    await $test.step("Wait long enough for OTPs GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Generate OTP: reuses the same OTP and expiresAt",
      async () => {
        const res = await makeRequest(publicSubjectId, defaultBody);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toBe(firstOtp);
        expect(body.expiresAt).toBe(firstExpiresAt);
      },
    );

    await $test.step("Wait long enough for OTPs GSI to update", () =>
      sleep(1_000),
    );

    const { otp: secondOtp, expiresAt: secondExpiresAt } = await $test.step(
      "Generate OTP reissueUnusedUnexpiredOTP=false, maxAllowedBeforeLockout.count=3: issues a new OTP expiring in ~900s, creates lockout",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await makeRequest(publicSubjectId, {
          ...defaultBody,
          reissueUnusedUnexpiredOTP: false,
          lockoutDuration: 5,
          maxAllowedBeforeLockout: { count: 3 },
        });
        const after = Math.floor(Date.now() / 1000);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toMatch(/^\d{6}$/);
        expect(body.otp).not.toBe(firstOtp);
        expect(body.expiresAt).toBeGreaterThanOrEqual(before + 900);
        expect(body.expiresAt).toBeLessThanOrEqual(after + 900);
        expect(body.expiresAt).not.toBe(firstExpiresAt);
        return body;
      },
    );

    await $test.step(
      "Wait long enough for OTPs GSI and lockouts GSI to update",
      () => sleep(1_000),
    );

    await $test.step("Generate OTP: locked out", async () => {
      const res = await makeRequest(publicSubjectId, defaultBody);
      expect(res.status).toBe(403);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1002);
    });

    await $test.step("Wait for lockout to expire", () => sleep(4_000));

    const { otp: thirdOtp, expiresAt: thirdExpiresAt } = await $test.step(
      "Generate OTP, expiresIn=4s: issues a new OTP expiring in ~4s",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await makeRequest(publicSubjectId, {
          ...defaultBody,
          expiresIn: 4,
        });
        const after = Math.floor(Date.now() / 1000);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toMatch(/^\d{6}$/);
        expect(body.otp).not.toBe(secondOtp);
        expect(body.expiresAt).toBeGreaterThanOrEqual(before + 4);
        expect(body.expiresAt).toBeLessThanOrEqual(after + 4);
        expect(body.expiresAt).not.toBe(secondExpiresAt);
        return body;
      },
    );

    await $test.step(
      "Wait for longer than next window, for OTP to expire and for OTPs GSI to update",
      () => sleep(5_000),
    );

    const { otp: fourthOtp, expiresAt: fourthExpiresAt } = await $test.step(
      "Generate OTP, maxAllowedBeforeLockout.count=2, maxAllowedBeforeLockout.window=4: issues a new OTP expiring in ~900s (does not reissue expired OTP), does not consider OTPs outside of window and so does not create lockout",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await makeRequest(publicSubjectId, {
          ...defaultBody,
          maxAllowedBeforeLockout: { count: 2, window: 4 },
        });
        const after = Math.floor(Date.now() / 1000);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toMatch(/^\d{6}$/);
        expect(body.otp).not.toBe(thirdOtp);
        expect(body.expiresAt).toBeGreaterThanOrEqual(before + 900);
        expect(body.expiresAt).toBeLessThanOrEqual(after + 900);
        expect(body.expiresAt).not.toBe(thirdExpiresAt);
        return body;
      },
    );

    await $test.step("Wait long enough for OTPs GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Generate OTP: reuses the same OTP and expiresAt",
      async () => {
        const res = await makeRequest(publicSubjectId, defaultBody);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toBe(fourthOtp);
        expect(body.expiresAt).toBe(fourthExpiresAt);
      },
    );

    await $test.step("Wait long enough for OTPs GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Generate OTP, maxAllowedBeforeLockout.count=1: reuses the same OTP and expiresAt, creates lockout",
      async () => {
        const res = await makeRequest(publicSubjectId, {
          ...defaultBody,
          maxAllowedBeforeLockout: { count: 1 },
        });
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toBe(fourthOtp);
        expect(body.expiresAt).toBe(fourthExpiresAt);
      },
    );

    await $test.step(
      "Wait long enough for OTPs GSI and lockouts GSI to update",
      () => sleep(1_000),
    );

    await $test.step("Generate OTP: locked out", async () => {
      const res = await makeRequest(publicSubjectId, defaultBody);
      expect(res.status).toBe(403);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1002);
    });

    await $test.step("Wait long enough for OTPs GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Generate OTP for different source: issues a new OTP expiring in ~900s (does not consider lockouts for other sources)",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await makeRequest(publicSubjectId, {
          source: Source["passkey-create"],
        });
        const after = Math.floor(Date.now() / 1000);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toMatch(/^\d{6}$/);
        expect(body.otp).not.toBe(fourthOtp);
        expect(body.expiresAt).toBeGreaterThanOrEqual(before + 900);
        expect(body.expiresAt).toBeLessThanOrEqual(after + 900);
        expect(body.expiresAt).not.toBe(fourthExpiresAt);
      },
    );
  },
);
