import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import * as jose from "jose";

const ORIGINAL_ENV = { ...process.env };

// Mock jose BEFORE importing the SUT so top-level await uses the mocked importJWK
vi.mock(import("jose"), async () => {
  const actual = await vi.importActual<typeof jose>("jose");
  return {
    ...actual,
    importJWK: vi.fn(),
    SignJWT: vi.fn(),
  };
});

describe("generateAccessToken", () => {
  const mockUUID = "1234-uuid-1111-1111-1111";
  const mockSignedToken = "mock.jwt.token";
  const mockPrivateKey = { fake: "key" };

  let setProtectedHeaderMock: {
    setProtectedHeader: MockInstance;
    sign: MockInstance;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };

    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    vi.spyOn(crypto, "randomUUID").mockReturnValue(mockUUID);

    // Mock jose.importJWK
    (jose.importJWK as unknown as MockInstance).mockResolvedValue(
      mockPrivateKey,
    );

    // Mock SignJWT chain
    setProtectedHeaderMock = {
      setProtectedHeader: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue(mockSignedToken),
    };

    (jose.SignJWT as unknown as MockInstance).mockImplementation(
      () => setProtectedHeaderMock,
    );
  });

  it("should generate a signed JWT", async () => {
    const { generateAccessToken } = await import("./access-token.js");
    process.env["ACCESS_TOKEN_ISSUER"] = "http://localhost:6003";
    const token = await generateAccessToken();

    expect(jose.SignJWT).toHaveBeenCalledExactlyOnceWith({
      sub: expect.stringMatching(
        /^urn:fdc:gov.uk:2022:[0-9a-f-]{36}$/,
      ) as unknown as string,
      iss: "http://localhost:6003",
      aud: expect.stringMatching(
        /^[a-f0-9]{10}-[a-f0-9]{10}-[a-f0-9]{10}$/,
      ) as unknown as string,
      exp: expect.any(Number) as unknown as number,
      iat: expect.any(Number) as unknown as number,
      sid: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown as string,
      nonce: expect.stringMatching(
        /^[a-f0-9]{10}-[a-f0-9]{10}$/,
      ) as unknown as string,
      vot: "Cl.Cm",
    });

    expect(
      setProtectedHeaderMock.setProtectedHeader,
    ).toHaveBeenCalledExactlyOnceWith({
      kid: "B-QMUxdJOJ8ubkmArc4i1SGmfZnNNlM-va9h0HJ0jCo", // pragma: allowlist secret
      alg: "ES256",
    });

    expect(setProtectedHeaderMock.sign).toHaveBeenCalledExactlyOnceWith(
      mockPrivateKey,
    );
    expect(token).toBe(mockSignedToken);
  });
});
