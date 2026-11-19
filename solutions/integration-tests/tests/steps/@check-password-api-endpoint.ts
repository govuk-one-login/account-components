import { expect } from "@playwright/test";
import { bdd } from "./fixtures.js";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl.js";
import * as v from "valibot";
import { UnsecuredJWT } from "jose";
import { randomUUID } from "node:crypto";

const { When } = bdd;

const checkPasswordEndpointPath = "/check-password";

const Source = {
  "account-delete": "account-delete",
  "passkey-create": "passkey-create",
} as const;

const errorResponseSchema = v.object({
  code: v.number(),
});

const lockoutSchema = v.object({
  id: v.string(),
  lockedOutAt: v.number(),
  lockedOutUntil: v.number(),
  source: v.string(),
  type: v.string(),
});

const checkPasswordResponseSchema = v.object({
  valid: v.boolean(),
  lockout: v.optional(lockoutSchema),
});

const getAdapiApiAccessToken = (
  verifyPasswordScenario:
    | "successful_verification"
    | "unsuccessful_verification" = "unsuccessful_verification",
) => {
  return new UnsecuredJWT({
    verifyPassword_scenario: verifyPasswordScenario,
  }).encode();
};

const checkPassword = async (
  publicSubjectId: string,
  body: Record<string, unknown>,
  adapiAccessToken: ReturnType<
    typeof getAdapiApiAccessToken
  > | null = getAdapiApiAccessToken(),
) => {
  const baseUrl = await getApiBaseUrl();
  return fetch(`${baseUrl}${checkPasswordEndpointPath}/${publicSubjectId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(!adapiAccessToken ? {} : { "x-adapi-accesstoken": adapiAccessToken }),
    },
    body: JSON.stringify(body),
  });
};

const defaultSource = Source["account-delete"];
const password = "pa55w0rd"; // pragma: allowlist secret

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

When(
  "I run the check password endpoint scenario",
  async ({ scenarioData, $test }) => {
    const publicSubjectId = scenarioData.id;
    const otherPublicSubjectId = randomUUID();

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
          null,
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
      const res = await checkPassword(publicSubjectId, {
        password,
        source: defaultSource,
      });
      expect(res.status).toBe(200);
      const body = v.parse(checkPasswordResponseSchema, await res.json());
      expect(body.valid).toBe(false);
      expect(body.lockout).toBeUndefined();
    });

    await $test.step("Wait long enough for password checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Wrong password, maxAllowedBeforeLockout.count=2: invalid password response, creates lockout",
      async () => {
        const before = Math.floor(Date.now() / 1000);
        const res = await checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          lockoutDuration: 5,
          maxAllowedBeforeLockout: { count: 2 },
        });
        const after = Math.floor(Date.now() / 1000);
        expect(res.status).toBe(200);
        const body = v.parse(checkPasswordResponseSchema, await res.json());
        expect(body.valid).toBe(false);
        expect(body.lockout?.source).toBe(defaultSource);
        expect(body.lockout?.type).toBe("TooManyIncorrectPasswordsEntered");
        expect(body.lockout?.lockedOutUntil).toBeGreaterThanOrEqual(before + 5);
        expect(body.lockout?.lockedOutUntil).toBeLessThanOrEqual(after + 5);
      },
    );

    await $test.step(
      "Wait long enough for password checks GSI and lockouts GSI to update",
      () => sleep(1_000),
    );

    await $test.step(
      "Correct password for different publicSubjectId: successful response",
      async () => {
        const res = await checkPassword(
          otherPublicSubjectId,
          {
            password,
            source: defaultSource,
          },
          getAdapiApiAccessToken("successful_verification"),
        );
        expect(res.status).toBe(200);
        const body = v.parse(checkPasswordResponseSchema, await res.json());
        expect(body.valid).toBe(true);
      },
    );

    await $test.step("Correct password: locked out", async () => {
      const res = await checkPassword(
        publicSubjectId,
        {
          password,
          source: defaultSource,
        },
        getAdapiApiAccessToken("successful_verification"),
      );
      expect(res.status).toBe(403);
      const body = v.parse(errorResponseSchema, await res.json());
      expect(body.code).toBe(1004);
    });

    await $test.step(
      "Correct password for different source: successful response",
      async () => {
        const res = await checkPassword(
          publicSubjectId,
          {
            password,
            source: Source["passkey-create"],
          },
          getAdapiApiAccessToken("successful_verification"),
        );
        expect(res.status).toBe(200);
        const body = v.parse(checkPasswordResponseSchema, await res.json());
        expect(body.valid).toBe(true);
      },
    );

    await $test.step(
      "Wait for lockout to expire and for password checks GSI to update",
      () => sleep(6_000),
    );

    await $test.step(
      "Wrong password, maxAllowedBeforeLockout.count=2: invalid password response, does not consider unsuccessful checks which have already contributed to lockouts and so does not create lockout",
      async () => {
        const res = await checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 2 },
        });
        expect(res.status).toBe(200);
        const body = v.parse(checkPasswordResponseSchema, await res.json());
        expect(body.valid).toBe(false);
        expect(body.lockout).toBeUndefined();
      },
    );

    await $test.step("Wait long enough for password checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step("Correct password: successful response", async () => {
      const res = await checkPassword(
        publicSubjectId,
        {
          password,
          source: defaultSource,
        },
        getAdapiApiAccessToken("successful_verification"),
      );
      expect(res.status).toBe(200);
      const body = v.parse(checkPasswordResponseSchema, await res.json());
      expect(body.valid).toBe(true);
    });

    await $test.step("Wait long enough for password checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step(
      "Wrong password, maxAllowedBeforeLockout.count=2: invalid password response, does not consider unsuccessful checks from before successful check and so does not create lockout",
      async () => {
        const res = await checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 2 },
        });
        expect(res.status).toBe(200);
        const body = v.parse(checkPasswordResponseSchema, await res.json());
        expect(body.valid).toBe(false);
        expect(body.lockout).toBeUndefined();
      },
    );

    await $test.step(
      "Wait for longer than next window and for password checks GSI to update",
      () => sleep(5_000),
    );

    await $test.step(
      "Wrong password, maxAllowedBeforeLockout.count=2, maxAllowedBeforeLockout.window=4: invalid password response, does not consider checks outside of window and so does not create lockout",
      async () => {
        const res = await checkPassword(publicSubjectId, {
          password,
          source: defaultSource,
          maxAllowedBeforeLockout: { count: 2, window: 4 },
        });
        expect(res.status).toBe(200);
        const body = v.parse(checkPasswordResponseSchema, await res.json());
        expect(body.valid).toBe(false);
        expect(body.lockout).toBeUndefined();
      },
    );

    await $test.step("Wait long enough for password checks GSI to update", () =>
      sleep(1_000),
    );

    await $test.step("Correct password: successful response", async () => {
      const res = await checkPassword(
        publicSubjectId,
        {
          password,
          source: defaultSource,
        },
        getAdapiApiAccessToken("successful_verification"),
      );
      expect(res.status).toBe(200);
      const body = v.parse(checkPasswordResponseSchema, await res.json());
      expect(body.valid).toBe(true);
    });
  },
);
