import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import type { FastifyRequest } from "fastify";
import { DynamoDbSessionStore } from "./dynamoDbSessionStore.js";

const mockGetEnvironment = vi.fn();

vi.mock(import("../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: mockGetEnvironment,
}));

vi.mock(import("../../../commons/utils/constants.js"), () => ({
  rootDomainWithEnv: "test.com",
}));

vi.mock(import("./dynamoDbSessionStore.js"), () => ({
  DynamoDbSessionStore: vi.fn(),
}));

const { getSessionOptions, destroySession } = await import("./session.js");

describe("session utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("destroySession", () => {
    it("calls session.regenerate on the request", async () => {
      const mockRegenerate = vi.fn().mockResolvedValue(undefined);
      const mockRequest = {
        session: {
          regenerate: mockRegenerate,
        },
      } as unknown as FastifyRequest;

      await destroySession(mockRequest);

      expect(mockRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSessionOptions", () => {
    it("throws when SESSIONS_SIGNER is missing", () => {
      delete process.env["SESSIONS_SIGNER"];
      process.env["SESSIONS_TABLE_NAME"] = "test-table";

      expect(() => getSessionOptions()).toThrow();
    });

    it("throws when SESSIONS_TABLE_NAME is missing", () => {
      process.env["SESSIONS_SIGNER"] = "test-signer";
      delete process.env["SESSIONS_TABLE_NAME"];

      expect(() => getSessionOptions()).toThrow();
    });

    it("returns session options with secure cookie for non-local environment", () => {
      process.env["SESSIONS_SIGNER"] = "test-signer";
      process.env["SESSIONS_TABLE_NAME"] = "test-table";
      mockGetEnvironment.mockReturnValue("production");

      const options = getSessionOptions();

      expect(options.secret).toBe("test-signer");
      expect(options.cookie?.secure).toBe(true);
      expect(options.cookie?.sameSite).toBe("strict");
      expect(options.cookie?.httpOnly).toBe(true);
      expect(options.cookie?.domain).toBe("test.com");
      expect(options.cookieName).toBe("amc_sess");
      expect(options.cookie?.path).toBe("/");
      expect(options.rolling).toBe(false);
      expect(options.saveUninitialized).toBe(false);
      expect(options.store).toBeDefined();
    });

    it("returns session options with non-secure cookie for local environment", () => {
      process.env["SESSIONS_SIGNER"] = "test-signer";
      process.env["SESSIONS_TABLE_NAME"] = "test-table";
      mockGetEnvironment.mockReturnValue("local");

      const options = getSessionOptions();

      expect(options.cookie?.secure).toBe(false);
    });

    it("creates DynamoDB store with table name", () => {
      process.env["SESSIONS_SIGNER"] = "test-signer";
      process.env["SESSIONS_TABLE_NAME"] = "test-table";
      mockGetEnvironment.mockReturnValue("production");

      const options = getSessionOptions();

      expect(options.store).toBeInstanceOf(DynamoDbSessionStore);
    });
  });
});
