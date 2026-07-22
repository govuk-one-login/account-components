import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

const {
  mockDecodeAttestationObject,
  mockParseAuthenticatorData,
  mockConvertAAGUIDToString,
  mockDecodeCredentialPublicKey,
  mockToBuffer,
  mockFromBuffer,
} = vi.hoisted(() => ({
  mockDecodeAttestationObject: vi.fn(),
  mockParseAuthenticatorData: vi.fn(),
  mockConvertAAGUIDToString: vi.fn(),
  mockDecodeCredentialPublicKey: vi.fn(),
  mockToBuffer: vi.fn(),
  mockFromBuffer: vi.fn(),
}));

// @ts-expect-error
vi.mock(import("../../../../../../commons/utils/logger/index.js"), () => ({
  logger: { error: vi.fn() },
}));

// @ts-expect-error
vi.mock(import("@simplewebauthn/server/helpers"), () => ({
  decodeAttestationObject: mockDecodeAttestationObject,
  parseAuthenticatorData: mockParseAuthenticatorData,
  convertAAGUIDToString: mockConvertAAGUIDToString,
  decodeCredentialPublicKey: mockDecodeCredentialPublicKey,
  isoBase64URL: {
    toBuffer: mockToBuffer,
    fromBuffer: mockFromBuffer,
  },
  cose: {
    COSEKEYS: {
      alg: 3,
    },
  },
}));

import { extractRegistrationResponseInfo } from "./index.js";

function buildResponse(
  overrides: Partial<RegistrationResponseJSON> = {},
): RegistrationResponseJSON {
  return {
    id: "credential-id-base64url",
    rawId: "credential-id-base64url",
    type: "public-key",
    response: {
      clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
      attestationObject: "attestation-object-base64url",
      transports: ["hybrid", "internal"],
      ...overrides.response,
    },
    clientExtensionResults: {},
    ...overrides,
  };
}

function setupMocks(
  overrides: {
    fmt?: string;
    aaguid?: Uint8Array | null;
    credentialID?: Uint8Array | null;
    counter?: number;
    flags?: { up: boolean; uv: boolean; be: boolean; bs: boolean };
    credentialPublicKey?: Uint8Array | null;
    alg?: number | string | undefined;
  } = {},
) {
  const fmt = overrides.fmt ?? "packed";
  const aaguid =
    overrides.aaguid === null
      ? undefined
      : (overrides.aaguid ?? new Uint8Array(16));
  const credentialID =
    overrides.credentialID === null
      ? undefined
      : (overrides.credentialID ?? new Uint8Array([1, 2, 3]));
  const counter = overrides.counter ?? 0;
  const flags = overrides.flags ?? { up: true, uv: true, be: true, bs: true };
  const credentialPublicKey =
    overrides.credentialPublicKey === null
      ? undefined
      : (overrides.credentialPublicKey ?? new Uint8Array([4, 5, 6]));
  const alg = "alg" in overrides ? overrides.alg : -7;

  mockToBuffer.mockReturnValue(new Uint8Array([1, 2, 3]));
  mockFromBuffer.mockReturnValue("credential-id-base64url");
  mockConvertAAGUIDToString.mockReturnValue(
    "00000000-0000-0000-0000-000000000000",
  );

  const decodedAttestationObject = new Map();
  decodedAttestationObject.set("fmt", fmt);
  decodedAttestationObject.set("authData", new Uint8Array([7, 8, 9]));
  mockDecodeAttestationObject.mockReturnValue(decodedAttestationObject);

  mockParseAuthenticatorData.mockReturnValue({
    aaguid,
    credentialID,
    counter,
    flags,
    credentialPublicKey,
  });

  const publicKeyMap = new Map();
  publicKeyMap.set(3, alg);
  mockDecodeCredentialPublicKey.mockReturnValue(publicKeyMap);
}

describe("extractRegistrationResponseInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all fields when registration response is fully populated", () => {
    setupMocks();
    const response = buildResponse();

    const result = extractRegistrationResponseInfo(response);

    expect(result).toStrictEqual({
      credentialId: "credential-id-base64url",
      aaguid: "00000000-0000-0000-0000-000000000000",
      counter: 0,
      credentialBackedUp: true,
      userVerified: true,
      publicKeyAlgorithm: -7,
      credentialDeviceType: "multi-device",
      credentialTransports: ["hybrid", "internal"],
      fmt: "packed",
    });
  });

  describe("credentialId", () => {
    it("returns the credential ID as a base64url string", () => {
      setupMocks();
      mockFromBuffer.mockReturnValue("abc123");
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialId).toBe("abc123");
    });

    it("returns undefined when credentialID is not present in auth data", () => {
      setupMocks({ credentialID: null });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialId).toBeUndefined();
    });
  });

  describe("aaguid", () => {
    it("returns the AAGUID as a string", () => {
      setupMocks();
      mockConvertAAGUIDToString.mockReturnValue(
        "adce0002-35bc-c60a-648b-0b25f1f05503",
      );
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.aaguid).toBe("adce0002-35bc-c60a-648b-0b25f1f05503");
    });

    it("returns undefined when aaguid is not present in auth data", () => {
      setupMocks({ aaguid: null });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.aaguid).toBeUndefined();
    });
  });

  describe("counter", () => {
    it("returns the counter value", () => {
      setupMocks({ counter: 42 });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.counter).toBe(42);
    });

    it("returns 0 when counter is zero", () => {
      setupMocks({ counter: 0 });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.counter).toBe(0);
    });
  });

  describe("credentialBackedUp", () => {
    it("returns true when bs flag is true", () => {
      setupMocks({ flags: { up: true, uv: true, be: true, bs: true } });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialBackedUp).toBe(true);
    });

    it("returns false when bs flag is false", () => {
      setupMocks({ flags: { up: true, uv: true, be: true, bs: false } });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialBackedUp).toBe(false);
    });
  });

  describe("userVerified", () => {
    it("returns true when uv flag is true", () => {
      setupMocks({ flags: { up: true, uv: true, be: true, bs: true } });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.userVerified).toBe(true);
    });

    it("returns false when uv flag is false", () => {
      setupMocks({ flags: { up: true, uv: false, be: true, bs: true } });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.userVerified).toBe(false);
    });
  });

  describe("publicKeyAlgorithm", () => {
    it("returns -7 for ES256", () => {
      setupMocks({ alg: -7 });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.publicKeyAlgorithm).toBe(-7);
    });

    it("returns -257 for RS256", () => {
      setupMocks({ alg: -257 });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.publicKeyAlgorithm).toBe(-257);
    });

    it("returns undefined when alg is not a number", () => {
      setupMocks({ alg: "not-a-number" });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.publicKeyAlgorithm).toBeUndefined();
    });

    it("returns undefined when alg is undefined", () => {
      setupMocks({ alg: undefined });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.publicKeyAlgorithm).toBeUndefined();
    });

    it("returns undefined when credentialPublicKey is not present", () => {
      setupMocks({ credentialPublicKey: null });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.publicKeyAlgorithm).toBeUndefined();
      expect(mockDecodeCredentialPublicKey).not.toHaveBeenCalled();
    });
  });

  describe("credentialDeviceType", () => {
    it("returns 'multi-device' when be flag is true", () => {
      setupMocks({ flags: { up: true, uv: true, be: true, bs: true } });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialDeviceType).toBe("multi-device");
    });

    it("returns 'single-device' when be flag is false", () => {
      setupMocks({ flags: { up: true, uv: true, be: false, bs: false } });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialDeviceType).toBe("single-device");
    });
  });

  describe("credentialTransports", () => {
    it("returns transports from the response", () => {
      setupMocks();
      const response = buildResponse({
        response: {
          clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
          attestationObject: "attestation-object-base64url",
          transports: ["usb", "nfc", "ble"],
        },
      });

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialTransports).toStrictEqual(["usb", "nfc", "ble"]);
    });

    it("returns undefined when transports are not present", () => {
      setupMocks();
      const response = buildResponse({
        response: {
          clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0",
          attestationObject: "attestation-object-base64url",
        },
      });

      const result = extractRegistrationResponseInfo(response);

      expect(result.credentialTransports).toBeUndefined();
    });
  });

  describe("fmt", () => {
    it.each(["packed", "fido-u2f", "none", "android-key", "tpm", "apple"])(
      "returns '%s' format",
      (format) => {
        setupMocks({ fmt: format });
        const response = buildResponse();

        const result = extractRegistrationResponseInfo(response);

        expect(result.fmt).toBe(format);
      },
    );
  });

  it("returns undefined when registrationResponse is undefined", () => {
    const result = extractRegistrationResponseInfo(undefined);

    expect(result).toStrictEqual({
      credentialId: undefined,
      aaguid: undefined,
      counter: undefined,
      credentialBackedUp: undefined,
      userVerified: undefined,
      publicKeyAlgorithm: undefined,
      credentialDeviceType: undefined,
      credentialTransports: undefined,
      fmt: undefined,
    });
    expect(mockDecodeAttestationObject).not.toHaveBeenCalled();
  });

  describe("error handling", () => {
    it("returns all undefined values when decodeAttestationObject throws", () => {
      setupMocks();
      mockDecodeAttestationObject.mockImplementation(() => {
        throw new Error("Invalid attestation object");
      });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result).toStrictEqual({
        credentialId: undefined,
        aaguid: undefined,
        counter: undefined,
        credentialBackedUp: undefined,
        userVerified: undefined,
        publicKeyAlgorithm: undefined,
        credentialDeviceType: undefined,
        credentialTransports: undefined,
        fmt: undefined,
      });
    });

    it("returns all undefined values when parseAuthenticatorData throws", () => {
      setupMocks();
      mockParseAuthenticatorData.mockImplementation(() => {
        throw new Error("Invalid auth data");
      });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result).toStrictEqual({
        credentialId: undefined,
        aaguid: undefined,
        counter: undefined,
        credentialBackedUp: undefined,
        userVerified: undefined,
        publicKeyAlgorithm: undefined,
        credentialDeviceType: undefined,
        credentialTransports: undefined,
        fmt: undefined,
      });
    });

    it("returns all undefined values when isoBase64URL.toBuffer throws", () => {
      setupMocks();
      mockToBuffer.mockImplementation(() => {
        throw new Error("Invalid base64url");
      });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result).toStrictEqual({
        credentialId: undefined,
        aaguid: undefined,
        counter: undefined,
        credentialBackedUp: undefined,
        userVerified: undefined,
        publicKeyAlgorithm: undefined,
        credentialDeviceType: undefined,
        credentialTransports: undefined,
        fmt: undefined,
      });
    });

    it("returns all undefined values when decodeCredentialPublicKey throws", () => {
      setupMocks();
      mockDecodeCredentialPublicKey.mockImplementation(() => {
        throw new Error("Invalid public key");
      });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result).toStrictEqual({
        credentialId: undefined,
        aaguid: undefined,
        counter: undefined,
        credentialBackedUp: undefined,
        userVerified: undefined,
        publicKeyAlgorithm: undefined,
        credentialDeviceType: undefined,
        credentialTransports: undefined,
        fmt: undefined,
      });
    });

    it("returns all undefined values when convertAAGUIDToString throws", () => {
      setupMocks();
      mockConvertAAGUIDToString.mockImplementation(() => {
        throw new Error("Invalid AAGUID");
      });
      const response = buildResponse();

      const result = extractRegistrationResponseInfo(response);

      expect(result).toStrictEqual({
        credentialId: undefined,
        aaguid: undefined,
        counter: undefined,
        credentialBackedUp: undefined,
        userVerified: undefined,
        publicKeyAlgorithm: undefined,
        credentialDeviceType: undefined,
        credentialTransports: undefined,
        fmt: undefined,
      });
    });
  });

  describe("helper function calls", () => {
    it("passes the attestation object buffer to decodeAttestationObject", () => {
      const fakeBuffer = new Uint8Array([10, 20, 30]);
      setupMocks();
      mockToBuffer.mockReturnValue(fakeBuffer);
      const response = buildResponse();

      extractRegistrationResponseInfo(response);

      expect(mockToBuffer).toHaveBeenCalledWith("attestation-object-base64url");
      expect(mockDecodeAttestationObject).toHaveBeenCalledWith(fakeBuffer);
    });

    it("passes authData to parseAuthenticatorData", () => {
      const fakeAuthData = new Uint8Array([11, 22, 33]);
      setupMocks();
      const decodedAttestationObject = new Map();
      decodedAttestationObject.set("fmt", "packed");
      decodedAttestationObject.set("authData", fakeAuthData);
      mockDecodeAttestationObject.mockReturnValue(decodedAttestationObject);
      const response = buildResponse();

      extractRegistrationResponseInfo(response);

      expect(mockParseAuthenticatorData).toHaveBeenCalledWith(fakeAuthData);
    });

    it("passes credentialPublicKey to decodeCredentialPublicKey", () => {
      const fakePublicKey = new Uint8Array([44, 55, 66]);
      setupMocks({ credentialPublicKey: fakePublicKey });
      const response = buildResponse();

      extractRegistrationResponseInfo(response);

      expect(mockDecodeCredentialPublicKey).toHaveBeenCalledWith(fakePublicKey);
    });

    it("passes credentialID to isoBase64URL.fromBuffer", () => {
      const fakeCredentialID = new Uint8Array([77, 88, 99]);
      setupMocks({ credentialID: fakeCredentialID });
      const response = buildResponse();

      extractRegistrationResponseInfo(response);

      expect(mockFromBuffer).toHaveBeenCalledWith(fakeCredentialID);
    });

    it("passes aaguid to convertAAGUIDToString", () => {
      const fakeAaguid = new Uint8Array(16).fill(1);
      setupMocks({ aaguid: fakeAaguid });
      const response = buildResponse();

      extractRegistrationResponseInfo(response);

      expect(mockConvertAAGUIDToString).toHaveBeenCalledWith(fakeAaguid);
    });
  });
});
