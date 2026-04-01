import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateJwtToken,
  getScenario,
  getJwtHeader,
  getJwtPayload,
  getAlgorithm,
} from "./index.js";
import { JwtAdapter } from "../../../utils/jwt-adapter.js";
import { CustomError } from "../../../utils/errors.js";
import {
  MockRequestObjectScenarios,
  Algorithms,
  Kids,
  DEFAULT_SCENARIO,
  Users,
} from "../../../types/common.js";
import type { AuthorizeRequestObject } from "../../../types/common.js";
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

  const requestBody: AuthorizeRequestObject = {
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

    const { token, jwtPayload, jwtHeader } = await generateJwtToken(
      requestBody,
      scenario,
    );

    expect(token).toBe(fakeToken);
    expect(jwtPayload).toBeDefined();
    expect(jwtHeader).toBeDefined();
  });

  it("should generate token with RSA algorithm", async () => {
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const fakeToken = "fake.jwt.token";
    const mockSign = vi.fn().mockResolvedValue(fakeToken);
    vi.mocked(JwtAdapter).mockImplementation(function () {
      return {
        sign: mockSign,
      } as unknown as JwtAdapter;
    });

    const requestBodyWithRSA = {
      ...requestBody,
      algorithm: Algorithms.RSA,
    };

    const { token } = await generateJwtToken(
      requestBodyWithRSA,
      MockRequestObjectScenarios.VALID,
    );

    expect(token).toBe(fakeToken);
    expect(mockSign).toHaveBeenCalledWith(
      expect.objectContaining({ alg: Algorithms.RSA }),
      expect.any(Object),
      "RSA",
    );
  });

  it("should throw CustomError if token is not generated", async () => {
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    vi.mocked(JwtAdapter).mockImplementation(function () {
      return {
        sign: vi.fn().mockResolvedValue(null),
      } as unknown as JwtAdapter;
    });

    const scenario = MockRequestObjectScenarios.VALID;

    await expect(generateJwtToken(requestBody, scenario)).rejects.toThrow(
      "Token not generated",
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

    await expect(generateJwtToken(requestBody, scenario)).rejects.toThrow(
      "Failed to sign token",
    );
  });
});

describe("getScenario", () => {
  it("should return matching scenario and delete scenario from body", () => {
    const input = {
      scenario: MockRequestObjectScenarios.EXPIRED,
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
    };

    expect(getScenario(input)).toBe(MockRequestObjectScenarios.EXPIRED);
    expect(input.scenario).toBeUndefined();
  });

  it("should return DEFAULT_SCENARIO if no match and delete scenario from body", () => {
    const input = {
      scenario: "non-existent",
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
    };

    expect(getScenario(input)).toBe(DEFAULT_SCENARIO);
    expect(input.scenario).toBeUndefined();
  });
});

describe("getAlgorithm", () => {
  it("should return specified algorithm", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      algorithm: Algorithms.RSA,
    };

    expect(getAlgorithm(body)).toBe(Algorithms.RSA);
    expect(body.algorithm).toBeUndefined();
  });

  it("should return default EC algorithm if not specified", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
    };

    expect(getAlgorithm(body)).toBe(Algorithms.EC);
  });

  it("should return default EC algorithm for invalid algorithm", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      algorithm: "invalid-alg",
    };

    expect(getAlgorithm(body)).toBe(Algorithms.EC);
  });
});

describe("getJwtHeader", () => {
  it("should set correct alg and kid for EC algorithm", () => {
    const header = getJwtHeader(
      MockRequestObjectScenarios.VALID,
      Algorithms.EC,
    );

    expect(header.alg).toBe(Algorithms.EC);
    expect(header.kid).toBe(Kids.EC);
    expect(header.typ).toBe("JWT");
  });

  it("should set correct alg and kid for RSA algorithm", () => {
    const header = getJwtHeader(
      MockRequestObjectScenarios.VALID,
      Algorithms.RSA,
    );

    expect(header.alg).toBe(Algorithms.RSA);
    expect(header.kid).toBe(Kids.RSA);
    expect(header.typ).toBe("JWT");
  });

  it("should handle MISSING_KID scenario", () => {
    const header = getJwtHeader(
      MockRequestObjectScenarios.MISSING_KID,
      Algorithms.EC,
    );

    expect(header.kid).toBeUndefined();
    expect(header.alg).toBe(Algorithms.EC);
  });

  it("should handle WRONG_KID scenario", () => {
    const header = getJwtHeader(
      MockRequestObjectScenarios.WRONG_KID,
      Algorithms.EC,
    );

    expect(header.kid).toBe(Kids.WRONG);
    expect(header.alg).toBe(Algorithms.EC);
  });
});

describe("getJwtPayload", () => {
  it("should parse string body and return correct payload", () => {
    const body = JSON.stringify({
      client_id: "my-client-id",
      aud: "customAudience",
      iat: 10,
      scope: "customScope",
      channel: "web",
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
    expect(payload["channel"]).toBe("web");
    expect(payload["extra"]).toBe("value");
    expect(payload["client_id"]).toBe("my-client-id");
    expect(payload["email"]).toBe("testuser@test.null.local");
    expect(payload["state"]).toBeTypeOf("string");
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
    expect(payload["channel"]).toBe("web");
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

  it("should handle non_existent user", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      user: Users.NON_EXISTENT,
    };
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const payload = getJwtPayload(MockRequestObjectScenarios.VALID, body);

    expect(payload.sub).toBe("");
    expect(payload["public_sub"]).toBe("");
    expect(payload["email"]).toBe("");
  });

  it("should use custom user_email_address when provided", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      user_email_address: "custom@example.com",
    };
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const payload = getJwtPayload(MockRequestObjectScenarios.VALID, body);

    expect(payload["email"]).toBe("custom@example.com");
  });

  it("should use custom iss when provided", () => {
    const body = {
      client_id: "my-client-id",
      iss: "custom-issuer.com",
      jti: "nonce-abc-123",
    };
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const payload = getJwtPayload(MockRequestObjectScenarios.VALID, body);

    expect(payload.iss).toBe("custom-issuer.com");
  });

  it("should use custom state when provided", () => {
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
      state: "custom-state-123",
    };
    process.env["DEFAULT_AUDIENCE"] = "default-audience";

    const payload = getJwtPayload(MockRequestObjectScenarios.VALID, body);

    expect(payload["state"]).toBe("custom-state-123");
  });

  it("should throw error when DEFAULT_AUDIENCE is not set", () => {
    delete process.env["DEFAULT_AUDIENCE"];
    const body = {
      client_id: "my-client-id",
      iss: "issuer.example.com",
      jti: "nonce-abc-123",
    };

    expect(() => getJwtPayload(MockRequestObjectScenarios.VALID, body)).toThrow(
      "DEFAULT_AUDIENCE is not set",
    );
  });
});
