import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getAuthRequest } from "./getAuthRequest.js";

const mockGet = vi.fn();
const getDynamoDbClientMock = vi.fn(() => ({ get: mockGet }));

vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
);
const mockedDynamoDbClient = vi.mocked(
  await import(
    "../../../../../commons/utils/awsClient/dynamodbClient/index.js"
  ),
).getDynamoDbClient;

describe("getAuthRequest", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, AUTH_TABLE_NAME: "auth-table" };
    mockedDynamoDbClient.mockImplementation(
      getDynamoDbClientMock as any as typeof mockedDynamoDbClient,
    );
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws when AUTH_TABLE_NAME is not configured", async () => {
    delete process.env["AUTH_TABLE_NAME"];

    await expect(
      getAuthRequest("code-1", "https://example.com/callback"),
    ).rejects.toThrow("AUTH_TABLE_NAME is not configured");
  });

  it("returns the parsed auth request when data is valid", async () => {
    const item = {
      code: "valid-code",
      outcome_id: "outcome-123",
      client_id: "client-abc",
      sub: "user-xyz",
      redirect_uri: "https://example.com/callback",
      expires: Date.now() / 1000 + 600,
    };
    mockGet.mockResolvedValueOnce({ Item: item });

    await expect(
      getAuthRequest("valid-code", "https://example.com/callback"),
    ).resolves.toStrictEqual(item);

    expect(mockGet).toHaveBeenCalledWith({
      TableName: "auth-table",
      Key: { code: "valid-code" },
      ConsistentRead: true,
    });
  });

  it("throws an error when redirect_uri doesn't match assertion", async () => {
    const item = {
      code: "valid-code",
      outcome_id: "outcome-123",
      client_id: "client-abc",
      sub: "user-xyz",
      redirect_uri: "https://example.com/other-callback",
      expires: Date.now() / 1000 + 600,
    };
    mockGet.mockResolvedValueOnce({ Item: item });

    await expect(async () => {
      await getAuthRequest("valid-code", "https://example.com/callback");
    }).rejects.toThrow(
      "Auth request data is invalid for code: valid-code, auth request redirect=https://example.com/other-callback, client assertion redirect=https://example.com/callback",
    );
  });

  it("throws an error when token is expired", async () => {
    const item = {
      code: "valid-code",
      outcome_id: "outcome-123",
      client_id: "client-abc",
      sub: "user-xyz",
      redirect_uri: "https://example.com/callback",
      expires: Date.now() / 1000 - 10,
    };
    mockGet.mockResolvedValueOnce({ Item: item });

    await expect(async () => {
      await getAuthRequest("valid-code", "https://example.com/callback");
    }).rejects.toThrow(
      "Auth request data is invalid for code: valid-code, Auth request has expired",
    );
  });
});
