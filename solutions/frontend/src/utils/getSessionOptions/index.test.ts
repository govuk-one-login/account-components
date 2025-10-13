import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";

const mockGetEnvironment = vi.fn();
const mockGetDynamoDbClient = vi.fn();
const mockConnectDynamoDB = vi.fn();
const mockSession = {};

vi.mock(import("../../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: mockGetEnvironment,
}));

vi.mock(import("../../../../commons/utils/awsClient/index.js"), () => ({
  getDynamoDbClient: mockGetDynamoDbClient,
}));

vi.mock(import("connect-dynamodb"), () => ({
  default: mockConnectDynamoDB,
}));

vi.mock("express-session", () => ({
  default: mockSession,
}));

const { getSessionOptions } = await import("./index.js");

describe("getSessionOptions", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };

    mockGetDynamoDbClient.mockReturnValue({
      docClient: {},
    });

    const mockStore = vi.fn().mockReturnValue({});
    mockConnectDynamoDB.mockReturnValue(mockStore);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("throws when SESSIONS_SECRET is missing", () => {
    delete process.env["SESSIONS_SECRET"];
    process.env["SESSIONS_TABLE_NAME"] = "test-table";

    expect(() => getSessionOptions()).toThrow();
  });

  it("throws when SESSIONS_TABLE_NAME is missing", () => {
    process.env["SESSIONS_SECRET"] = "test-secret"; // pragma: allowlist-secret
    delete process.env["SESSIONS_TABLE_NAME"];

    expect(() => getSessionOptions()).toThrow();
  });

  it("returns session options with secure cookie for non-local environment", () => {
    process.env["SESSIONS_SECRET"] = "test-secret"; // pragma: allowlist-secret
    process.env["SESSIONS_TABLE_NAME"] = "test-table";
    mockGetEnvironment.mockReturnValue("production");

    const options = getSessionOptions();

    expect(options.secret).toBe("test-secret");
    expect(options.cookie?.secure).toBe(true);
    expect(options.cookie?.sameSite).toBe("lax");
    expect(options.cookie?.maxAge).toBe(3600000);
    expect(options.cookie?.httpOnly).toBe(true);
    expect(options.rolling).toBe(false);
  });

  it("returns session options with non-secure cookie for local environment", () => {
    process.env["SESSIONS_SECRET"] = "test-secret"; // pragma: allowlist-secret
    process.env["SESSIONS_TABLE_NAME"] = "test-table";
    mockGetEnvironment.mockReturnValue("local");

    const options = getSessionOptions();

    expect(options.cookie?.secure).toBe(false);
  });

  it("creates DynamoDB store with correct configuration", async () => {
    process.env["SESSIONS_SECRET"] = "test-secret"; // pragma: allowlist-secret
    process.env["SESSIONS_TABLE_NAME"] = "test-table";
    mockGetEnvironment.mockReturnValue("production");

    const mockDocClient = {};
    const mockStoreConstructor = vi.fn();

    mockGetDynamoDbClient.mockReturnValue({
      docClient: mockDocClient,
    });
    mockConnectDynamoDB.mockReturnValue(mockStoreConstructor);

    const { getSessionOptions: freshGetSessionOptions } = await import(
      "./index.js"
    );
    freshGetSessionOptions();

    expect(mockStoreConstructor).toHaveBeenCalledWith({
      table: "test-table",
      client: mockDocClient,
      specialKeys: [{ name: "user_id", type: "S" }],
      skipThrowMissingSpecialKeys: true,
    });
  });
});
