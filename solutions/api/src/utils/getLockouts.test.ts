import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Source, LockoutType } from "../../../commons/utils/constants.js";

const mockQuery = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({ query: mockQuery }),
  }),
);

const { getLockouts } = await import("./getLockouts.js");

const publicSubjectId = "test-subject-id";
const FAKE_NOW_MS = 1_700_000_000_000;
const FAKE_NOW_S = Math.floor(FAKE_NOW_MS / 1000);

const makeLockoutItem = (overrides = {}) => ({
  id: "lockout-1",
  publicSubjectId,
  lockedOutAt: FAKE_NOW_S - 60,
  lockedOutUntil: FAKE_NOW_S + 3600,
  source: Source["account-delete"],
  type: LockoutType.TooManyOTPsRequested,
  keepUntil: FAKE_NOW_S + 7200,
  ...overrides,
});

describe("getLockouts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW_MS);
    vi.clearAllMocks();
    process.env["LOCKOUTS_TABLE_NAME"] = "lockouts-table";
    process.env["LOCKOUTS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"] =
      "publicSubjectId-index";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queries with correct parameters without type filter", async () => {
    mockQuery.mockResolvedValue({ Items: [] });

    await getLockouts({ publicSubjectId, source: Source["account-delete"] });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: "lockouts-table",
        IndexName: "publicSubjectId-index",
        KeyConditionExpression: "publicSubjectId = :publicSubjectId",
        FilterExpression: "lockedOutUntil > :now AND source = :source",
        ExpressionAttributeValues: expect.objectContaining({
          ":publicSubjectId": publicSubjectId,
          ":now": FAKE_NOW_S,
          ":source": Source["account-delete"],
        }),
      }),
    );
  });

  it("includes type in filter expression when type is provided", async () => {
    mockQuery.mockResolvedValue({ Items: [] });

    await getLockouts({
      publicSubjectId,
      source: Source["account-delete"],
      type: LockoutType.TooManyOTPsRequested,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression:
          "lockedOutUntil > :now AND source = :source AND type = :type",
        ExpressionAttributeValues: expect.objectContaining({
          ":type": LockoutType.TooManyOTPsRequested,
        }),
      }),
    );
  });

  it("returns parsed lockout items", async () => {
    mockQuery.mockResolvedValue({ Items: [makeLockoutItem()] });

    const result = await getLockouts({
      publicSubjectId,
      source: Source["account-delete"],
    });

    expect(result).toStrictEqual([
      expect.objectContaining({
        id: "lockout-1",
        publicSubjectId,
        source: Source["account-delete"],
        type: LockoutType.TooManyOTPsRequested,
      }),
    ]);
  });

  it("returns empty array when no items found", async () => {
    mockQuery.mockResolvedValue({ Items: [] });

    const result = await getLockouts({
      publicSubjectId,
      source: Source["account-delete"],
    });

    expect(result).toStrictEqual([]);
  });

  it("paginates through all pages using LastEvaluatedKey", async () => {
    const item1 = makeLockoutItem({ id: "lockout-1" });
    const item2 = makeLockoutItem({ id: "lockout-2" });

    mockQuery
      .mockResolvedValueOnce({
        Items: [item1],
        LastEvaluatedKey: { id: "lockout-1" },
      })
      .mockResolvedValueOnce({ Items: [item2] });

    const result = await getLockouts({
      publicSubjectId,
      source: Source["account-delete"],
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("passes ExclusiveStartKey on subsequent pages", async () => {
    const lastKey = { id: { S: "lockout-1" } };
    mockQuery
      .mockResolvedValueOnce({
        Items: [makeLockoutItem()],
        LastEvaluatedKey: lastKey,
      })
      .mockResolvedValueOnce({ Items: [] });

    await getLockouts({ publicSubjectId, source: Source["account-delete"] });

    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ ExclusiveStartKey: lastKey }),
    );
  });

  it("throws when items fail schema validation", async () => {
    mockQuery.mockResolvedValue({ Items: [{ id: { S: "bad-item" } }] });

    await expect(
      getLockouts({ publicSubjectId, source: Source["account-delete"] }),
    ).rejects.toThrow();
  });
});
