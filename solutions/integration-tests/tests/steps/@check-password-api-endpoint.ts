import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";
import * as v from "valibot";

const { When } = bdd;

const checkPasswordEndpointPath = "/check-password";

const Source = {
  "account-delete": "account-delete",
  "passkey-create": "passkey-create",
} as const;

const errorResponseSchema = v.object({
  code: v.number(),
});

const checkPassword = async (
  publicSubjectId: string,
  body: Record<string, unknown>,
  noAdapiToken = false,
) => {
  const baseUrl = await getApiBaseUrl();
  return fetch(`${baseUrl}${checkPasswordEndpointPath}/${publicSubjectId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(noAdapiToken ? {} : { "x-adapi-accesstoken": "fake-adapi-token" }),
    },
    body: JSON.stringify(body),
  });
};

const defaultSource = Source["account-delete"];
const password = "pa55w0rd";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

When(
  "I run the check password endpoint scenario",
  async ({ scenarioData, $test }) => {
    const publicSubjectId = scenarioData.id;

    await $test.step("Invalid requests", async () => {
      const invalidRequests = [
        checkPassword(publicSubjectId, {}),
        checkPassword(publicSubjectId, { password }),
        checkPassword(publicSubjectId, { source: defaultSource }),
        checkPassword(
          publicSubjectId,
          {
            password,
            source: defaultSource,
          },
          true,
        ),
        checkPassword(publicSubjectId, {
          password,
          source: "invalid-source",
        }),
        checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          lockoutDuration: 0,
        }),
        checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          lockoutDuration: 1.5,
        }),
        checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 0 },
        }),
        checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 1.5 },
        }),
        checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          maxAllowedBeforeLockout: { window: 0 },
        }),
        checkPassword(publicSubjectId, {
          password,
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

    await $test.step("Wrong password: invalid password response", async () => {
      // TODO make sure ADAPI responds with incorrect password response
      const res = await checkPassword(publicSubjectId, {
        password,
        source: defaultSource,
      });
      expect(res.status).toBe(401);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1005);
    });

    await $test.step("Wait long enough for password checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Wrong password, maxAllowedBeforeLockout.count=2: invalid password response, creates lockout",
      async () => {
        // TODO make sure ADAPI responds with incorrect password response
        const res = await checkPassword(publicSubjectId, {
          password,
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
      "Wait long enough for password checks GSI and lockouts GSI to update",
      () => sleep(1_000),
    );

    await $test.step("Correct password: locked out", async () => {
      // TODO make sure ADAPI responds with correct password response
      const res = await checkPassword(publicSubjectId, {
        password,
        source: defaultSource,
      });
      expect(res.status).toBe(403);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1003);
    });

    await $test.step(
      "Correct password for different source: successful response",
      async () => {
        // TODO make sure ADAPI responds with correct password response
        const res = await checkPassword(publicSubjectId, {
          password,
          source: Source["passkey-create"],
        });
        expect(res.status).toBe(204);
      },
    );

    await $test.step(
      "Wait for lockout to expire and for password checks GSI to update",
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
