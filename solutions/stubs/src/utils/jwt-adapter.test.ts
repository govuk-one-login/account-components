import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultKeyValue, JwtAdapter } from "./jwt-adapter.js";
import * as jose from "jose";
import { SignJWT } from "jose";
import type { JwtHeader } from "../types/common.js";
import { Algorithms, SignatureTypes } from "../types/common.js";

import type { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";

vi.mock(import("jose"));
vi.mock(import("../../../commons/utils/awsClient/ssmClient/index.js"), () => ({
  getParametersProvider: vi.fn(),
}));
vi.mock(import("../../../commons/utils/logger/index.js"));

const mockGet = vi.fn();
const mockParametersProvider = {
  get: mockGet,
} as unknown as SSMProvider;

describe("jwtAdapter", () => {
  let header: JwtHeader;
  let payload: jose.JWTPayload;

  beforeEach(async () => {
    vi.clearAllMocks();
    header = { alg: Algorithms.EC };
    payload = {};

    vi.spyOn(jose.base64url, "encode")
      .mockReturnValueOnce("encodedHeader")
      .mockReturnValueOnce("encodedPayload");
    vi.spyOn(SignJWT.prototype, "setProtectedHeader").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setIssuer").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setAudience").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setExpirationTime").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "sign").mockResolvedValue(
      "jwtHeader.jwtPayload.jwtSignature",
    );
    vi.spyOn(jose, "importPKCS8").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof jose.importPKCS8>>,
    );

    const { getParametersProvider } =
      await import("../../../commons/utils/awsClient/ssmClient/index.js");
    vi.mocked(getParametersProvider).mockReturnValue(mockParametersProvider);
    mockGet.mockResolvedValue("privateKey");
  });

  describe("sign", () => {
    describe("when private keys not cached", () => {
      it("throws error if it fails to retrieve private key from SSM", async () => {
        mockGet.mockRejectedValue("error");
        const signatureType = SignatureTypes.EC;
        process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"] =
          "/components-mocks/MockClientEcPrivateKey";

        const jwtAdapter = new JwtAdapter();

        await expect(
          jwtAdapter.sign(header, payload, signatureType),
        ).rejects.toThrowError(
          "Failed to retrieve key from SSM for param /components-mocks/MockClientEcPrivateKey",
        );
      });
    });

    describe("when private keys are cached", () => {
      it("does not call ssm to retrieve private keys when ec key is cached", async () => {
        const signatureType = SignatureTypes.EC;

        const jwtAdapter = new JwtAdapter();
        jwtAdapter.signingKeyMap.set("EC", "ecPrivateKey");

        const token = await jwtAdapter.sign(header, payload, signatureType);

        expect(token).to.eq("jwtHeader.jwtPayload.jwtSignature");
        expect(mockGet).not.toHaveBeenCalled();
      });

      it("does not call ssm to retrieve private keys when rsa key is cached", async () => {
        const signatureType = SignatureTypes.RSA;

        const jwtAdapter = new JwtAdapter();
        jwtAdapter.signingKeyMap.set("RSA", "rsaPrivateKey");

        const token = await jwtAdapter.sign(header, payload, signatureType);

        expect(token).to.eq("jwtHeader.jwtPayload.jwtSignature");
        expect(mockGet).not.toHaveBeenCalled();
      });
    });

    describe("when signing token", () => {
      it("creates EC token in a jwt format and correct signature", async () => {
        const signatureType = SignatureTypes.EC;

        const jwtAdapter = new JwtAdapter();
        jwtAdapter.signingKeyMap.set("EC", "ecPrivateKey");
        const token = await jwtAdapter.sign(header, payload, signatureType);

        expect(token).to.eq("jwtHeader.jwtPayload.jwtSignature");
      });

      it("creates token without a signature when alg claim equals none", async () => {
        header = { alg: Algorithms.NONE };
        const signatureType = SignatureTypes.EC;

        const jwtAdapter = new JwtAdapter();
        const token = await jwtAdapter.sign(header, payload, signatureType);

        expect(token).to.eq("encodedHeader.encodedPayload.");
      });
    });
  });

  describe("getDefaultKeyValue", () => {
    it("returns the default key value", () => {
      process.env["DEFAULT_SSM_VALUE"] = "mock-value";
      const defaultKeyValue = getDefaultKeyValue();

      expect(defaultKeyValue).to.eq("mock-value");
    });
  });
});
