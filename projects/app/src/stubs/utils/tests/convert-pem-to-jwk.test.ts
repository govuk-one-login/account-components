import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertPemToJwk } from "../convert-pem-to-jwk.js";
import type { JWK } from "jose";
import { exportJWK, importSPKI } from "jose";
import type { JwksKeyType } from "../../types/common.js";
import {
  Algorithms,
  JWEAlgorithms,
  SignatureTypes,
} from "../../types/common.js";

vi.mock("jose", () => ({
  importSPKI: vi.fn(),
  exportJWK: vi.fn(),
}));

// Mock logger
vi.mock("../utils/logger.js", () => ({
  default: {
    error: vi.fn(),
  },
}));

describe("convertPemToJwk", () => {
  const mockPem =
    "-----BEGIN PUBLIC KEY-----\nmock-pem-key\n-----END PUBLIC KEY-----";
  const mockKeyType: JwksKeyType = {
    alg: Algorithms.RSA,
    kid: "my-key-id",
    kty: SignatureTypes.RSA,
    jweAlg: JWEAlgorithms.RSA,
  };

  const mockPublicKey = { fake: "key" };
  const mockJwk: JWK = {
    kty: "RSA",
    e: "AQAB",
    n: "mockmodulus",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should convert PEM to JWK and assign kid", async () => {
    (importSPKI as ReturnType<typeof vi.fn>).mockResolvedValue(mockPublicKey);
    (exportJWK as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockJwk });

    // Act
    const result = await convertPemToJwk(mockPem, mockKeyType);

    // Assert
    expect(importSPKI).toHaveBeenCalledWith(mockPem.trim(), mockKeyType.alg);
    expect(exportJWK).toHaveBeenCalledWith(mockPublicKey);

    expect(result).toStrictEqual({
      kty: "RSA",
      e: "AQAB",
      n: "mockmodulus",
      kid: "my-key-id",
    });
  });

  it("should log and rethrow error if importSPKI fails", async () => {
    const error = new Error("importSPKI failed");
    (importSPKI as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(convertPemToJwk(mockPem, mockKeyType)).rejects.toThrow(
      "importSPKI failed",
    );
  });

  it("should log and rethrow error if exportJWK fails", async () => {
    (importSPKI as ReturnType<typeof vi.fn>).mockResolvedValue(mockPublicKey);
    const error = new Error("exportJWK failed");
    (exportJWK as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(convertPemToJwk(mockPem, mockKeyType)).rejects.toThrow(
      "exportJWK failed",
    );
  });
});
