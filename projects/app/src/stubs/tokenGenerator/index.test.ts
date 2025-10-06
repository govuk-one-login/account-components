import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateJwtToken,
  getScenario,
  getJwtHeader,
  getJwtPayload,
} from "./index.js";
import { JwtAdapter } from "../utils/jwt-adapter.js";
import { CustomError } from "../utils/errors.js";
import {
  MockRequestObjectScenarios,
  Algorithms,
  Kids,
  DEFAULT_SCENARIO,
} from "../types/common.js";
import type { RequestBody } from "../types/common.js";
import type { JWTPayload } from "jose";

vi.mock("../utils/jwt-adapter.js");
vi.mock("../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock(import("../utils/logger.js"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // your mocked methods
  };
});

describe("generateJwtToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const requestBody: RequestBody = {
    client_id: "my-client-id",
    iss: "issuer.example.com",
    jti: "nonce-abc-123",
    scenario: MockRequestObjectScenarios.VALID,
  };

  it("should generate a JWT token successfully", async () => {
    const fakeToken = "fake.jwt.token";
    vi.mocked(JwtAdapter).mockImplementation(
      () =>
        ({
          sign: vi.fn().mockResolvedValue(fakeToken),
        }) as unknown as JwtAdapter,
    );

    const scenario = MockRequestObjectScenarios.VALID;

    const token = await generateJwtToken(requestBody, scenario);

    expect(token).toBe(fakeToken);
  });

  it("should throw CustomError if token is not generated", async () => {
    vi.mocked(JwtAdapter).mockImplementation(
      () =>
        ({
          sign: vi.fn().mockResolvedValue(null),
        }) as unknown as JwtAdapter,
    );

    const scenario = MockRequestObjectScenarios.VALID;

    await expect(generateJwtToken(requestBody, scenario)).rejects.toThrow(
      CustomError,
    );
  });

  it("should throw CustomError if JwtAdapter.sign throws", async () => {
    vi.mocked(JwtAdapter).mockImplementation(
      () =>
        ({
          sign: vi.fn().mockRejectedValue(new Error("sign failed")),
        }) as unknown as JwtAdapter,
    );

    const scenario = MockRequestObjectScenarios.VALID;

    await expect(generateJwtToken(requestBody, scenario)).rejects.toThrow(
      CustomError,
    );
  });
});

describe("getScenario", () => {
  it("should return matching scenario", () => {
    const input = {
      scenario: MockRequestObjectScenarios.EXPIRED,
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
    };

    expect(getScenario(input)).toBe(MockRequestObjectScenarios.EXPIRED);
  });

  it("should return DEFAULT_SCENARIO if no match", () => {
    const input = {
      scenario: "non-existent",
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
    };

    expect(getScenario(input)).toBe(DEFAULT_SCENARIO);
  });
});

describe("getJwtHeader", () => {
  it("should set correct alg and kid for DEFAULT", () => {
    const header = getJwtHeader(MockRequestObjectScenarios.VALID);

    expect(header.alg).toBe(Algorithms.EC);
    expect(header.kid).toBe(Kids.EC);
    expect(header.typ).toBe("JWT");
  });

  it("should handle INVALID_ALGORITHM scenario", () => {
    const header = getJwtHeader(MockRequestObjectScenarios.INVALID_ALGORITHM);

    expect(header.alg).toBe(Algorithms.INVALID);
  });

  it("should handle NONE_ALGORITHM scenario", () => {
    const header = getJwtHeader(MockRequestObjectScenarios.NONE_ALGORITHM);

    expect(header.alg).toBe(Algorithms.NONE);
  });

  it("should handle MISSING_KID scenario", () => {
    const header = getJwtHeader(MockRequestObjectScenarios.MISSING_KID);

    expect(header.kid).toBeUndefined();
  });

  it("should handle WRONG_KID scenario", () => {
    const header = getJwtHeader(MockRequestObjectScenarios.WRONG_KID);

    expect(header.kid).toBe(Kids.WRONG);
  });
});

describe("getJwtPayload", () => {
  it("should parse string body and return correct payload", () => {
    const body = JSON.stringify({
      aud: "customAudience",
      iat: 10,
      scope: "customScope",
      ttl: 30,
      extra: "value",
    });

    const payload = getJwtPayload(MockRequestObjectScenarios.VALID, body);

    expect(payload.aud).toBe("customAudience");
    expect(payload["scope"]).toBe("customScope");
    expect(payload["extra"]).toBe("value");

    expect(payload.iss).toBeDefined();
  });

  it("should throw CustomError on invalid JSON string", () => {
    const invalidBody = "{bad json";

    expect(() =>
      getJwtPayload(MockRequestObjectScenarios.VALID, invalidBody),
    ).toThrow(CustomError);
  });

  it("should use default values if fields missing", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      scenario: MockRequestObjectScenarios.VALID,
    };
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const payload: JWTPayload = getJwtPayload(
      MockRequestObjectScenarios.VALID,
      body,
    );

    expect(payload["scope"]).toBeDefined();
    expect(payload.aud).toBeDefined();
  });

  it("should return expired token for EXPIRED scenario", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      scenario: MockRequestObjectScenarios.VALID,
    };
    const payload = getJwtPayload(MockRequestObjectScenarios.EXPIRED, body);

    expect(payload.exp).toBeLessThan(Math.floor(Date.now() / 1000));
  });

  it("should return future iat for IAT_IN_FUTURE scenario", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      scenario: MockRequestObjectScenarios.VALID,
    };
    const payload = getJwtPayload(
      MockRequestObjectScenarios.IAT_IN_FUTURE,
      body,
    );

    expect(payload.iat).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
