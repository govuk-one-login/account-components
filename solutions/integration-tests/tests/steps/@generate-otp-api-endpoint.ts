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

    const { otp: firstOtp, expiresAt: firstExpiresAt } = await $test.step(
      "Default params: issues a new 6-digit OTP expiring in ~900s",
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

    await $test.step("Wait 1 second", () => sleep(1_000));

    await $test.step(
      "Default params again: reuses the same OTP and expiresAt",
      async () => {
        const res = await makeRequest(publicSubjectId, defaultBody);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toBe(firstOtp);
        expect(body.expiresAt).toBe(firstExpiresAt);
      },
    );

    await $test.step("Wait 1 second", () => sleep(1_000));

    const { otp: secondOtp, expiresAt: secondExpiresAt } = await $test.step(
      "reissueUnusedUnexpiredOTP=false, lockoutDuration=5s, maxAllowedBeforeLockout.count=3: issues a new OTP expiring in ~900s",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await makeRequest(publicSubjectId, {
          ...defaultBody,
          reissueUnusedUnexpiredOTP: false,
          lockoutDuration: 10,
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

    await $test.step("Wait 1 second", () => sleep(1_000));

    await $test.step(
      "Default params: locked out after 3 OTPs requested (code 1002)",
      async () => {
        const res = await makeRequest(publicSubjectId, defaultBody);
        expect(res.status).toBe(403);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1002);
      },
    );

    await $test.step("Wait for lockout to expire", () => sleep(4_000));

    const { otp: thirdOtp, expiresAt: thirdExpiresAt } = await $test.step(
      "expiresIn=4s: issues a new OTP expiring in ~4s",
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

    await $test.step("Wait for OTP to expire", () => sleep(5_000));

    const { otp: fourthOtp, expiresAt: fourthExpiresAt } = await $test.step(
      "maxAllowedBeforeLockout.count=2, window=4: issues a new OTP expiring in ~900s",
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

    await $test.step("Wait 1 second", () => sleep(1_000));

    await $test.step(
      "Default params: reuses the same OTP and expiresAt",
      async () => {
        const res = await makeRequest(publicSubjectId, defaultBody);
        expect(res.status).toBe(200);
        const body = v.parse(generateOTPResponseSchema, await res.json());
        expect(body.otp).toBe(fourthOtp);
        expect(body.expiresAt).toBe(fourthExpiresAt);
      },
    );

    await $test.step("Wait 1 second", () => sleep(1_000));

    await $test.step(
      "maxAllowedBeforeLockout.count=1: still reuses the same OTP and expiresAt",
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

    await $test.step("Wait 1 second", () => sleep(1_000));

    await $test.step(
      "Default params: locked out after exceeding maxAllowedBeforeLockout (code 1002)",
      async () => {
        const res = await makeRequest(publicSubjectId, defaultBody);
        expect(res.status).toBe(403);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1002);
      },
    );

    await $test.step(
      "source=passkey-create: separate lockout scope, issues a new OTP expiring in ~900s",
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

    await $test.step(
      "Invalid requests: all return 400 with code 1001",
      async () => {
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
          const body = v.parse(
            errorResponseSchema,
            await invalidRequest.json(),
          );
          expect(body.code).toBe(1001);
        }
      },
    );
  },
);
