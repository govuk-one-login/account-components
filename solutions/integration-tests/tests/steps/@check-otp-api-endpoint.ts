import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";
import * as v from "valibot";
import { randomUUID } from "node:crypto";

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

const incorrectOtp = "XXXXXX";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

When(
  "I run the check OTP endpoint scenario",
  async ({ scenarioData, $test }) => {
    const publicSubjectId = scenarioData.id;
    const otherPublicSubjectId = randomUUID();

    await $test.step("Invalid requests", async () => {
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
        const body = v.parse(errorResponseSchema, await invalidRequest.json());
        expect(body.code).toBe(1001);
      }
    });

    await $test.step("No OTPs: invalid OTP response", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp: incorrectOtp,
        source: defaultSource,
      });
      expect(res.status).toBe(401);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1005);
    });

    await $test.step("Wait long enough for OTP checks GSI to update", () =>
      sleep(1_000),
    );

    const { otp } = await $test.step("Generate an OTP", async () =>
      generateOTP(publicSubjectId, {
        source: defaultSource,
      }),
    );

    const { otp: otpDifferentSource } = await $test.step(
      "Generate an OTP with a different source",
      async () =>
        generateOTP(publicSubjectId, {
          source: Source["passkey-create"],
        }),
    );

    await $test.step("Wrong OTP: invalid OTP response", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp: incorrectOtp,
        source: defaultSource,
      });
      expect(res.status).toBe(401);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1005);
    });

    await $test.step("Wait long enough for OTP checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Wrong OTP, maxAllowedBeforeLockout.count=2: invalid OTP response, creates lockout",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp: incorrectOtp,
          source: defaultSource,
          lockoutDuration: 5,
          maxAllowedBeforeLockout: { count: 2 },
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );

    await $test.step(
      "Wait long enough for OTP checks GSI and lockouts GSI to update",
      () => sleep(1_000),
    );

    const { otp: otpOtherSubject } = await $test.step(
      "Generate an OTP for a different publicSubjectId",
      async () =>
        generateOTP(otherPublicSubjectId, {
          source: defaultSource,
        }),
    );

    await $test.step(
      "Correct OTP for different publicSubjectId: successful response",
      async () => {
        const res = await checkOTP(otherPublicSubjectId, {
          otp: otpOtherSubject,
          source: defaultSource,
        });
        expect(res.status).toBe(204);
      },
    );

    await $test.step("Correct OTP: locked out", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp,
        source: defaultSource,
      });
      expect(res.status).toBe(403);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1003);
    });

    await $test.step(
      "Correct OTP for different source: successful response",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp: otpDifferentSource,
          source: Source["passkey-create"],
        });
        expect(res.status).toBe(204);
      },
    );

    await $test.step(
      "Wait for lockout to expire and for OTP checks GSI to update",
      () => sleep(6_000),
    );

    await $test.step(
      "Wrong OTP, maxAllowedBeforeLockout.count=2: invalid OTP response, does not consider unsuccessful checks which have already contributed to lockouts and so does not create lockout",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp: incorrectOtp,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 2 },
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );

    await $test.step("Wait long enough for OTP checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step("Correct OTP: successful response", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp,
        source: defaultSource,
      });
      expect(res.status).toBe(204);
    });

    await $test.step("Wait long enough for OTP checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Correct but used OTP, maxAllowedBeforeLockout.count=2: invalid OTP response, does not consider unsuccessful checks from before successful check and so does not create lockout",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 2 },
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );

    const { otp: newOtp } = await $test.step("Generate another OTP", async () =>
      generateOTP(publicSubjectId, {
        source: defaultSource,
      }),
    );

    await $test.step(
      "Wait for longer than next window and for OTP checks GSI to update",
      () => sleep(5_000),
    );

    await $test.step(
      "Wrong OTP, maxAllowedBeforeLockout.count=2, maxAllowedBeforeLockout.window=4: invalid OTP response, does not consider checks outside of window and so does not create lockout",
      async () => {
        const res = await checkOTP(publicSubjectId, {
          otp: incorrectOtp,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 2, window: 4 },
        });
        expect(res.status).toBe(401);
        const body = v.parse(errorResponseSchema, await res.json());
        expect(body.code).toBe(1005);
      },
    );

    await $test.step("Wait long enough for OTP checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step("Correct OTP: successful response", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp: newOtp,
        source: defaultSource,
      });
      expect(res.status).toBe(204);
    });

    const { otp: shortLivedOtp } = await $test.step(
      "Generate a short-lived OTP",
      async () =>
        generateOTP(publicSubjectId, {
          source: defaultSource,
          expiresIn: 2,
        }),
    );

    await $test.step(
      "Wait for short-lived OTP to expire and for OTP checks GSI to update",
      () => sleep(3_000),
    );

    await $test.step("Expired OTP: invalid OTP response", async () => {
      const res = await checkOTP(publicSubjectId, {
        otp: shortLivedOtp,
        source: defaultSource,
      });
      expect(res.status).toBe(401);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1005);
    });
  },
);
