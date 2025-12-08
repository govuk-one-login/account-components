import { describe, it, expect, vi, beforeEach } from "vitest";

import { verifyJti } from "./verifyJti.js";

const mockGet = vi.fn();
const mockPut = vi.fn();
const getDynamoDbClient = vi.fn(() => ({ get: mockGet, put: mockPut }));

vi.mock(
  import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
);
const mockGetDynamoDbClient = vi.mocked(
  await import("../../../../../commons/utils/awsClient/dynamodbClient/index.js"),
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

    await expect(verifyJti("nonce-1")).rejects.toThrowError(
      "REPLAY_ATTACK_TABLE_NAME not set",
    );
  });

  it("throws error when jti is missing", async () => {
    await expect(verifyJti(undefined)).rejects.toThrowError("jti is missing");
  });

  it("resolves when jti does not exist in table", async () => {
    mockPut.mockResolvedValueOnce({});

    await expect(verifyJti("nonce-3")).resolves.toBeUndefined();
    expect(getDynamoDbClient).toHaveBeenCalledTimes(1);
  });

  it("throws error when jti already exists in table", async () => {
    const error = new Error("ConditionalCheckFailedException");
    error.name = "ConditionalCheckFailedException";
    mockPut.mockRejectedValueOnce(error);

    await expect(verifyJti("nonce-4")).rejects.toThrowError(
      "jti found: nonce-4",
    );
  });

  it("throws error when dynamo lookup fails", async () => {
    mockPut.mockRejectedValueOnce(new Error("boom"));

    await expect(verifyJti("nonce-4")).rejects.toThrowError(
      "Error checking replay attack table",
    );
  });
});
