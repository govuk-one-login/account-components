import type { MockInstance } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultKeyValue, JwtAdapter } from "./jwt-adapter.js";
import * as jose from "jose";
import { SignJWT } from "jose";
import type { JwtHeader } from "../types/common.js";
import { Algorithms, SignatureTypes } from "../types/common.js";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";

vi.mock(import("jose"));
vi.mock(import("@aws-lambda-powertools/parameters/ssm"));
vi.mock(import("../../../commons/utils/logger/index.js"));

const getParameterCommand = getParameter as unknown as MockInstance<
  (name: string, options?: any) => Promise<string | undefined>
>;

describe("jwtAdapter", () => {
  let header: JwtHeader;
  let payload: jose.JWTPayload;

  beforeEach(() => {
    vi.clearAllMocks();
    header = { alg: Algorithms.EC };
    payload = {};

    vi.spyOn(jose.base64url, "encode")
      .mockReturnValueOnce("encodedHeader")
      .mockReturnValueOnce("encodedPayload");
    vi.spyOn(SignJWT.prototype, "setProtectedHeader").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setIssuedAt").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setIssuer").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setAudience").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "setExpirationTime").mockReturnThis();
    vi.spyOn(SignJWT.prototype, "sign").mockResolvedValue(
      "jwtHeader.jwtPayload.jwtSignature",
    );

    getParameterCommand.mockResolvedValue("privateKey");
  });

  describe("sign", () => {
    describe("when private keys not cached", () => {
      it("throws error if it fails to retrieve public key from SSM", async () => {
        getParameterCommand.mockRejectedValue("error");
        const signatureType = SignatureTypes.EC;
        process.env["MOCK_CLIENT_EC_PRIVATE_KEY_SSM_NAME"] =
          "/components-mocks/MockClientEcPrivateKey";

        const jwtAdapter = new JwtAdapter();

        await expect(
          jwtAdapter.sign(header, payload, signatureType),
        ).rejects.toThrow("Unable to retrieve private key");
      });
    });

    describe("when private keys are cached", () => {
      it("does not call ssm to retrieve private keys when ec key is cached", async () => {
        const signatureType = SignatureTypes.EC;

        const jwtAdapter = new JwtAdapter();
        jwtAdapter.signingKeyMap.set("EC", "ecPrivateKey");

        const token = await jwtAdapter.sign(header, payload, signatureType);

        expect(token).to.eq("jwtHeader.jwtPayload.jwtSignature");
        expect(getParameterCommand).not.toHaveBeenCalled();
      });

      it("does not call ssm to retrieve private keys when rsa key is cached", async () => {
        const signatureType = SignatureTypes.RSA;

        const jwtAdapter = new JwtAdapter();
        jwtAdapter.signingKeyMap.set("RSA", "rsaPrivateKey");

        const token = await jwtAdapter.sign(header, payload, signatureType);

        expect(token).to.eq("jwtHeader.jwtPayload.jwtSignature");
        expect(getParameterCommand).not.toHaveBeenCalled();
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
