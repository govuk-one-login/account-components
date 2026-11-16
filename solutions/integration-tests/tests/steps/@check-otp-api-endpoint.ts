import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";
import * as v from "valibot";

const { When } = bdd;

const generateOTPEndpointPath = "/generate-otp";
const checkOTPEndpointPath = "/check-otp";

const Source = {
  "account-delete": "account-delete",
  "passkey-create": "passkey-create",
} as const;

const errorResponseSchema = v.object({
  code: v.number(),
});

const generateOTPResponseSchema = v.object({
  otp: v.string(),
  expiresAt: v.number(),
});

const generateOTP = async (
  publicSubjectId: string,
  body: Record<string, unknown>,
) => {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(
    `${baseUrl}${generateOTPEndpointPath}/${publicSubjectId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  expect(res.status).toBe(200);
  return v.parse(generateOTPResponseSchema, await res.json());
};

const checkOTP = async (
  publicSubjectId: string,
  body: Record<string, unknown>,
) => {
  const baseUrl = await getApiBaseUrl();
  return fetch(`${baseUrl}${checkOTPEndpointPath}/${publicSubjectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const defaultSource = Source["account-delete"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

When(
  "I run the check OTP endpoint scenario",
  async ({ scenarioData, $test }) => {
    const publicSubjectId = scenarioData.id;

    await $test.step(
      "Invalid requests: all return 400 with code 1001",
      async () => {
        const invalidRequests = [
          checkOTP(publicSubjectId, {}),
          checkOTP(publicSubjectId, { otp: "123456" }),
          checkOTP(publicSubjectId, { source: defaultSource }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: "invalid-source",
          }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: defaultSource,
            lockoutDuration: 0,
          }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: defaultSource,
            lockoutDuration: 1.5,
          }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: defaultSource,
            maxAllowedBeforeLockout: { count: 0 },
          }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: defaultSource,
            maxAllowedBeforeLockout: { count: 1.5 },
          }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: defaultSource,
            maxAllowedBeforeLockout: { window: 0 },
          }),
          checkOTP(publicSubjectId, {
            otp: "123456",
            source: defaultSource,
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

    const { otp } = await $test.step("Generate an OTP", async () =>
      generateOTP(publicSubjectId, {
        source: defaultSource,
      }),
    );

    await $test.step("Wrong OTP: returns 401 with code 1005", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp: "00000X",
        source: defaultSource,
        lockoutDuration: 5,
        maxAllowedBeforeLockout: { count: 3 },
      });
      expect(res.status).toBe(401);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1005);
    });

    await $test.step(
      "Wrong OTP again: returns 401 with code 1005",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp: "000000",
          source: defaultSource,
          lockoutDuration: 5,
          maxAllowedBeforeLockout: { count: 3 },
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );

    await $test.step(
      "Wrong OTP a third time: locked out (code 1003)",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp: "000000",
          source: defaultSource,
          lockoutDuration: 5,
          maxAllowedBeforeLockout: { count: 3 },
        });
        expect(res.status).toBe(403);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1003);
      },
    );

    await $test.step(
      "Correct OTP while locked out: still returns 403 with code 1003",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp,
          source: defaultSource,
        });
        expect(res.status).toBe(403);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1003);
      },
    );

    await $test.step("Wait for lockout to expire", () => sleep(6_000));

    await $test.step(
      "Correct OTP after lockout expires: returns 204",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp,
          source: defaultSource,
        });
        expect(res.status).toBe(204);
      },
    );

    await $test.step(
      "Same OTP again (already used): returns 401 with code 1005",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp,
          source: defaultSource,
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );

    await $test.step(
      "source=passkey-create: separate lockout scope, wrong OTP returns 401 not 403",
      async () => {
        const { otp: passkeyOtp } = await generateOTP(publicSubjectId, {
          source: Source["passkey-create"],
        });
        const res = await checkOTP(publicSubjectId, {
          otp: passkeyOtp,
          source: Source["passkey-create"],
        });
        expect(res.status).toBe(204);
      },
    );

    await $test.step(
      "Generate a short-lived OTP (expiresIn=3s) and wait for it to expire",
      async () => {
        const { otp: shortLivedOtp } = await generateOTP(publicSubjectId, {
          source: defaultSource,
          reissueUnusedUnexpiredOTP: false,
          expiresIn: 3,
        });

        await sleep(4_000);

        const res = await checkOTP(publicSubjectId, {
          otp: shortLivedOtp,
          source: defaultSource,
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );
  },
);
