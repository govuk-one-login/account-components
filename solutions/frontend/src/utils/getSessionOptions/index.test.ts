import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";

const mockGetEnvironment = vi.fn();
const mockGetDynamoDbClient = vi.fn();
const mockConnectDynamoDB = vi.fn();
const mockSession = {};

vi.mock(import("../../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: mockGetEnvironment,
}));

vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: mockGetDynamoDbClient,
  }),
);

vi.mock(import("connect-dynamodb"), () => ({
  default: mockConnectDynamoDB,
}));

// @ts-expect-error
vi.mock(import("express-session"), () => ({
  default: mockSession,
}));

const { getSessionOptions } = await import("./index.js");

describe("getSessionOptions", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };

    mockGetDynamoDbClient.mockReturnValue({
      client: {},
    });

    const mockStore = vi.fn().mockImplementation(function () {
      return {};
    });
    mockConnectDynamoDB.mockReturnValue(mockStore);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("throws when SESSIONS_SIGNER is missing", async () => {
    delete process.env["SESSIONS_SIGNER"];
    process.env["SESSIONS_TABLE_NAME"] = "test-table";

    await expect(getSessionOptions()).rejects.toThrow();
  });

  it("throws when SESSIONS_TABLE_NAME is missing", async () => {
    process.env["SESSIONS_SIGNER"] = "test-signer";
    delete process.env["SESSIONS_TABLE_NAME"];

    await expect(getSessionOptions()).rejects.toThrow();
  });

  it("returns session options with secure cookie for non-local environment", async () => {
    process.env["SESSIONS_SIGNER"] = "test-signer";
    process.env["SESSIONS_TABLE_NAME"] = "test-table";
    mockGetEnvironment.mockReturnValue("production");

    const options = await getSessionOptions();

    expect(options.secret).toBe("test-signer");
    expect(options.cookie?.secure).toBe(true);
    expect(options.cookie?.sameSite).toBe("lax");
    expect(options.cookie?.maxAge).toBe(3600000);
    expect(options.cookie?.httpOnly).toBe(true);
    expect(options.rolling).toBe(false);
    expect(options.saveUninitialized).toBe(false);
  });

  it("returns session options with non-secure cookie for local environment", async () => {
    process.env["SESSIONS_SIGNER"] = "test-signer";
    process.env["SESSIONS_TABLE_NAME"] = "test-table";
    mockGetEnvironment.mockReturnValue("local");

    const options = await getSessionOptions();

    expect(options.cookie?.secure).toBe(false);
  });

  it("creates DynamoDB store with correct configuration", async () => {
    process.env["SESSIONS_SIGNER"] = "test-signer";
    process.env["SESSIONS_TABLE_NAME"] = "test-table";
    mockGetEnvironment.mockReturnValue("production");

    const mockClient = {};
    const mockStoreConstructor = vi.fn();

    mockGetDynamoDbClient.mockReturnValue({
      client: mockClient,
    });
    mockConnectDynamoDB.mockReturnValue(mockStoreConstructor);

    const { getSessionOptions: freshGetSessionOptions } = await import(
      "./index.js"
    );
    await freshGetSessionOptions();

    expect(mockStoreConstructor).toHaveBeenCalledWith({
      table: "test-table",
      client: mockClient,
      specialKeys: [{ name: "user_id", type: ScalarAttributeType.S }],
      skipThrowMissingSpecialKeys: true,
    });
  });
});
