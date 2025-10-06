import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockInstance } from "vitest";
import * as jose from "jose";
import { generateAccessToken } from "./access-token.js";
import { MockRequestObjectScenarios } from "../types/common.js";
import type { RequestBody } from "../types/common.js";

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

  const requestBody: RequestBody = {
    client_id: "my-client-id",
    iss: "issuer.example.com",
    jti: "nonce-abc-123",
    scenario: MockRequestObjectScenarios.VALID,
  };

  let setProtectedHeaderMock: {
    setProtectedHeader: MockInstance;
    sign: MockInstance;
  };

  beforeEach(() => {
    vi.clearAllMocks();

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
    const token = await generateAccessToken(requestBody);

    expect(jose.importJWK).toHaveBeenCalledExactlyOnceWith(
      {
        alg: "ES256",
        crv: "P-256",
        d: "Ob4_qMu1nkkBLEw97u--PHVsShP3xOKOJ6z0WsdU0Xw", // pragma: allowlist secret
        kid: "B-QMUxdJOJ8ubkmArc4i1SGmfZnNNlM-va9h0HJ0jCo", // pragma: allowlist secret
        kty: "EC",
        use: "sig",
        x: "YrTTzbuUwQhWyaj11w33k-K8bFydLfQssVqr8mx6AVE", // pragma: allowlist secret
        y: "8UQcw-6Wp0bp8iIIkRw8PW2RSSjmj1I_8euyKEDtWRk", // pragma: allowlist secret
      },
      "ES256",
    );
    expect(jose.SignJWT).toHaveBeenCalledExactlyOnceWith({
      sub: `urn:fdc:gov.uk:2022:${mockUUID}`,
      iss: requestBody.iss,
      aud: requestBody.client_id,
      exp: expect.any(Number) as unknown as number,
      iat: expect.any(Number) as unknown as number,
      sid: mockUUID,
      nonce: requestBody.jti,
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
