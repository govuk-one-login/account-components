import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateJwtToken,
  getScenario,
  getJwtHeader,
  getJwtPayload,
} from "./index.js";
import { JwtAdapter } from "../../../utils/jwt-adapter.js";
import { CustomError } from "../../../utils/errors.js";
import {
  MockRequestObjectScenarios,
  Algorithms,
  Kids,
  DEFAULT_SCENARIO,
} from "../../../types/common.js";
import type { RequestBody } from "../../../types/common.js";
import type { JWTPayload } from "jose";

const ORIGINAL_ENV = { ...process.env };

vi.mock(import("../../../utils/jwt-adapter.js"), () => ({
  JwtAdapter: vi.fn().mockImplementation(function () {
    return {
      sign: vi.fn(),
    };
  }),
}));
// @ts-expect-error
vi.mock(import("../../../../../commons/utils/logger/index.js"), () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("generateJwtToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  const requestBody: RequestBody = {
    client_id: "my-client-id",
    iss: "issuer.example.com",
    jti: "nonce-abc-123",
    scenario: MockRequestObjectScenarios.VALID,
  };

  it("should generate a JWT token successfully", async () => {
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const fakeToken = "fake.jwt.token";
    vi.mocked(JwtAdapter).mockImplementation(function () {
      return {
        sign: vi.fn().mockResolvedValue(fakeToken),
      } as unknown as JwtAdapter;
    });

    const scenario = MockRequestObjectScenarios.VALID;

    const { token } = await generateJwtToken(requestBody, scenario);

    expect(token).toBe(fakeToken);
  });

  it("should throw CustomError if token is not generated", async () => {
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    vi.mocked(JwtAdapter).mockImplementation(function () {
      return {
        sign: vi.fn().mockResolvedValue(null),
      } as unknown as JwtAdapter;
    });

    const scenario = MockRequestObjectScenarios.VALID;

    await expect(generateJwtToken(requestBody, scenario)).rejects.toThrowError(
      CustomError,
    );
  });

  it("should throw CustomError if JwtAdapter.sign throws", async () => {
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    vi.mocked(JwtAdapter).mockImplementation(function () {
      return {
        sign: vi.fn().mockRejectedValue(new Error("sign failed")),
      } as unknown as JwtAdapter;
    });

    const scenario = MockRequestObjectScenarios.VALID;

    await expect(generateJwtToken(requestBody, scenario)).rejects.toThrowError(
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
      client_id: "my-client-id",
      aud: "customAudience",
      iat: 10,
      scope: "customScope",
      exp: 30,
      extra: "value",
    });

    const payload = getJwtPayload(MockRequestObjectScenarios.VALID, body);

    expect(payload.aud).toBe("customAudience");
    expect(payload.iss).toBe("my-client-id");
    expect(payload.jti).toBeTypeOf("string");
    expect(payload.iat).toBeTypeOf("number");
    expect(payload.exp).toBeTypeOf("number");
    expect(payload.sub).toBe("urn:fdc:gov.uk:default");
    expect(payload["public_sub"]).toBe("4c950955-03c3-45a4-a97e-763152c172ff");
    expect(payload["scope"]).toBe("customScope");
    expect(payload["extra"]).toBe("value");
    expect(payload["client_id"]).toBe("my-client-id");
    expect(payload["email"]).toBe("someone@example.com");
    expect(payload["govuk_signin_journey_id"]).toBeTypeOf("string");
    expect(payload["state"]).toBeTypeOf("string");
  });

  it("should throw CustomError on invalid JSON string", () => {
    const invalidBody = "{bad json";

    expect(() =>
      getJwtPayload(MockRequestObjectScenarios.VALID, invalidBody),
    ).toThrowError(CustomError);
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
