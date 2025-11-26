import { describe, it, expect, vi, beforeEach } from "vitest";

import { verifyJti } from "./verifyJti.js";

const mockGet = vi.fn();
const mockPut = vi.fn();
const getDynamoDbClient = vi.fn(() => ({ get: mockGet, put: mockPut }));

vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
);
const mockGetDynamoDbClient = vi.mocked(
  await import(
    "../../../../../commons/utils/awsClient/dynamodbClient/index.js"
  ),
).getDynamoDbClient;

describe("verifyJti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["REPLAY_ATTACK_TABLE_NAME"] = "replay-table";
    mockGetDynamoDbClient.mockImplementation(
      getDynamoDbClient as any as typeof mockGetDynamoDbClient,
    );
  });

  it("throws error when REPLAY_ATTACK_TABLE_NAME is missing", async () => {
    delete process.env["REPLAY_ATTACK_TABLE_NAME"];

    await expect(verifyJti("nonce-1")).rejects.toThrow(
      "REPLAY_ATTACK_TABLE_NAME not set",
    );
  });

  it("throws error when jti is missing", async () => {
    await expect(verifyJti(undefined)).rejects.toThrow("jti is missing");
  });

  it("throws error when jti found in table", async () => {
    mockGet.mockResolvedValueOnce({ Item: "nonce-2" });

    await expect(verifyJti("nonce-2")).rejects.toThrow("jti found: nonce-2");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("resolves when jti does not exist in table", async () => {
    mockGet.mockResolvedValueOnce({ Item: undefined });

    await expect(verifyJti("nonce-3")).resolves.toBeUndefined();
    expect(getDynamoDbClient).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith({
      TableName: "replay-table",
      Key: { nonce: "nonce-3" },
      ConsistentRead: true,
    });
  });

  it("stores jti in table after verification", async () => {
    mockGet.mockResolvedValueOnce({ Item: undefined });

    await verifyJti("nonce-4");

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining<Record<string, unknown>>({
        TableName: "replay-table",
        Item: expect.objectContaining<{ nonce: string }>({
          nonce: "nonce-4",
        }),
      }),
    );
  });

  it("throws error when dynamo lookup fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("boom"));

    await expect(verifyJti("nonce-4")).rejects.toThrow(
      "Error checking replay attack table",
    );
  });
});
