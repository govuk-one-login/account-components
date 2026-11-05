import { describe, it, expect, vi, beforeEach } from "vitest";
import { LockoutType, Source } from "../../../../commons/utils/constants.js";
import { otpChecksDatabaseItem } from "../../../../commons/utils/schemas.js";
import type * as v from "valibot";

const mockTransactWrite = vi.fn();
const mockQuery = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: vi.fn(() => ({
      transactWrite: mockTransactWrite,
      query: mockQuery,
    })),
  }),
);

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  randomUUID: vi.fn(() => "test-uuid"),
}));

const { maybeCreateLockout } = await import("./maybeCreateLockout.js");

interface TransactItem {
  Put: {
    TableName: string;
    Item: { id: string; lockouts?: unknown };
    ConditionExpression: string;
  };
}

const getTransactItems = (): TransactItem[] =>
  (mockTransactWrite.mock.calls[0]?.[0] as { TransactItems: TransactItem[] })
    .TransactItems;

const NOW = new Date("2025-01-01T00:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const makeItem = (
  overrides: Partial<v.InferOutput<typeof otpChecksDatabaseItem>> = {},
) => ({
  id: "item-1",
  publicSubjectId: "sub-123",
  source: Source["account-delete"],
  createdAt: NOW_SECONDS,
  successful: false,
  ...overrides,
});

const baseInput = {
  publicSubjectId: "sub-123",
  source: Source["account-delete"],
  type: LockoutType.TooManyIncorrectOTPsEntered,
  tableName: "checks-table",
  publicSubjectIdGsiName: "publicSubjectId-index",
  itemSchema: otpChecksDatabaseItem,
  itemShouldContributeToLockout: (
    item: v.InferOutput<typeof otpChecksDatabaseItem>,
  ) => !item.successful,
  itemCountForLockout: 3,
  window: 10800,
  duration: 900,
};

describe("maybeCreateLockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env["LOCKOUTS_TABLE_NAME"] = "lockouts-table";
  });

  describe("early returns", () => {
    it("returns undefined if query returns no items", async () => {
      mockQuery.mockResolvedValue({
        Items: undefined,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout(baseInput);

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });

    it("returns undefined if query returns an empty array", async () => {
      mockQuery.mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });

      const result = await maybeCreateLockout(baseInput);

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });

    it("returns undefined if fewer items than itemCountForLockout", async () => {
      mockQuery.mockResolvedValue({
        Items: [makeItem(), makeItem()],
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout(baseInput);

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });
  });

  it("queries DynamoDB with the correct parameters", async () => {
    mockQuery.mockResolvedValue({
      Items: undefined,
      LastEvaluatedKey: undefined,
    });

    await maybeCreateLockout(baseInput);

    expect(mockQuery).toHaveBeenCalledWith({
      TableName: "checks-table",
      IndexName: "publicSubjectId-index",
      KeyConditionExpression: "publicSubjectId = :publicSubjectId",
      FilterExpression: "source = :source AND createdAt > :createdSince",
      ExpressionAttributeValues: {
        ":publicSubjectId": "sub-123",
        ":source": Source["account-delete"],
        ":createdSince": NOW_SECONDS - baseInput.window,
      },
      ConsistentRead: true,
      ScanIndexForward: false,
      ExclusiveStartKey: undefined,
    });
  });

  it("paginates until LastEvaluatedKey is undefined", async () => {
    const page1Key = { id: "page-1-last" };
    mockQuery
      .mockResolvedValueOnce({
        Items: [makeItem({ id: "1" }), makeItem({ id: "2" })],
        LastEvaluatedKey: page1Key,
      })
      .mockResolvedValueOnce({
        Items: [makeItem({ id: "3" })],
        LastEvaluatedKey: undefined,
      });

    const result = await maybeCreateLockout(baseInput);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ ExclusiveStartKey: page1Key }),
    );
    expect(result).toBeDefined();
  });

  describe("mostRecent mode (default)", () => {
    it("uses the most recent itemCountForLockout items as contributing items", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout(baseInput);

      expect(result).toMatchObject({
        id: "test-uuid",
        publicSubjectId: "sub-123",
        source: Source["account-delete"],
        type: LockoutType.TooManyIncorrectOTPsEntered,
        lockedOutAt: NOW,
        lockedOutUntil: new Date(NOW.getTime() + 900 * 1000),
      });

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["1", "2", "3"]);
    });

    it("returns undefined if any of the most recent items do not qualify", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2", successful: true }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout(baseInput);

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });

    it("only considers the first itemCountForLockout items, ignoring further qualifying items", async () => {
      const items = [
        makeItem({ id: "1", successful: true }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
        makeItem({ id: "4" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout(baseInput);

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });
  });

  describe("any mode", () => {
    it("uses all qualifying items within the window as contributing items", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3", successful: true }),
        makeItem({ id: "4" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({ ...baseInput, mode: "Any" });

      expect(result).toBeDefined();

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["1", "2", "4"]);
    });

    it("only uses the first itemCountForLockout qualifying items", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
        makeItem({ id: "4" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      await maybeCreateLockout({ ...baseInput, mode: "Any" });

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["1", "2", "3"]);
    });

    it("returns undefined if not enough qualifying items exist", async () => {
      const items = [
        makeItem({ id: "1", successful: true }),
        makeItem({ id: "2" }),
        makeItem({ id: "3", successful: true }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({ ...baseInput, mode: "Any" });

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });
  });

  describe("consecutive mode", () => {
    it("uses the first consecutive run of qualifying items as contributing items", async () => {
      const items = [
        makeItem({ id: "1", successful: true }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
        makeItem({ id: "4" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({
        ...baseInput,
        mode: "Consecutive",
      });

      expect(result).toBeDefined();

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["2", "3", "4"]);
    });

    it("returns undefined when no consecutive run of sufficient length exists", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3", successful: true }),
        makeItem({ id: "4" }),
        makeItem({ id: "5" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({
        ...baseInput,
        mode: "Consecutive",
      });

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });

    it("returns undefined when a non-qualifying item at the start leaves an insufficient run", async () => {
      const items = [
        makeItem({ id: "1", successful: true }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({
        ...baseInput,
        mode: "Consecutive",
      });

      expect(result).toBeUndefined();
      expect(mockTransactWrite).not.toHaveBeenCalled();
    });

    it("uses a run of exactly itemCountForLockout consecutive qualifying items", async () => {
      const items = [
        makeItem({ id: "1", successful: true }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
        makeItem({ id: "4" }),
        makeItem({ id: "5", successful: true }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({
        ...baseInput,
        mode: "Consecutive",
      });

      expect(result).toBeDefined();

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["2", "3", "4"]);
    });

    it("resets the run and uses items after a non-qualifying item", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3", successful: true }),
        makeItem({ id: "4" }),
        makeItem({ id: "5" }),
        makeItem({ id: "6" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({
        ...baseInput,
        mode: "Consecutive",
      });

      expect(result).toBeDefined();

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["4", "5", "6"]);
    });

    it("uses items from the start of the array when all qualify", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({
        ...baseInput,
        mode: "Consecutive",
      });

      expect(result).toBeDefined();

      const updatedIds = getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .map((i) => i.Put.Item.id);

      expect(updatedIds).toStrictEqual(["1", "2", "3"]);
    });
  });

  describe("lockout creation", () => {
    it("writes the lockout to the lockouts table", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      await maybeCreateLockout(baseInput);

      const lockoutPut = getTransactItems().find(
        (i) => i.Put.TableName === "lockouts-table",
      );

      expect(lockoutPut?.Put).toMatchObject({
        TableName: "lockouts-table",
        Item: expect.objectContaining({
          id: "test-uuid",
          publicSubjectId: "sub-123",
          lockedOutAt: NOW_SECONDS,
          lockedOutUntil: NOW_SECONDS + 900,
          source: Source["account-delete"],
          type: LockoutType.TooManyIncorrectOTPsEntered,
        }),
        ConditionExpression: "attribute_not_exists(id)",
      });
    });

    it("sets lockouts on a contributing item with no existing lockouts", async () => {
      const items = [
        makeItem({ id: "1", lockouts: undefined }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      await maybeCreateLockout(baseInput);

      const item1Put = getTransactItems().find((i) => i.Put.Item.id === "1");

      expect(item1Put?.Put.Item.lockouts).toStrictEqual([
        { type: LockoutType.TooManyIncorrectOTPsEntered, id: "test-uuid" },
      ]);
    });

    it("appends to existing lockouts on contributing items", async () => {
      const existingLockout = {
        type: LockoutType.TooManyOTPsRequested,
        id: "existing-lockout-id",
      };
      const items = [
        makeItem({ id: "1", lockouts: [existingLockout] }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      await maybeCreateLockout(baseInput);

      const item1Put = getTransactItems().find((i) => i.Put.Item.id === "1");

      expect(item1Put?.Put.Item.lockouts).toStrictEqual([
        existingLockout,
        { type: LockoutType.TooManyIncorrectOTPsEntered, id: "test-uuid" },
      ]);
    });

    it("writes contributing item puts with attribute_exists condition", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      await maybeCreateLockout(baseInput);

      getTransactItems()
        .filter((i) => i.Put.TableName === "checks-table")
        .forEach((i) => {
          expect(i.Put.ConditionExpression).toBe("attribute_exists(id)");
        });
    });

    it("returns lockout with Date objects for timestamps", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout(baseInput);

      expect(result?.lockedOutAt).toStrictEqual(NOW);
      expect(result?.lockedOutUntil).toStrictEqual(
        new Date(NOW.getTime() + 900 * 1000),
      );
    });

    it("uses the duration parameter to calculate lockedOutUntil", async () => {
      const items = [
        makeItem({ id: "1" }),
        makeItem({ id: "2" }),
        makeItem({ id: "3" }),
      ];
      mockQuery.mockResolvedValue({
        Items: items,
        LastEvaluatedKey: undefined,
      });

      const result = await maybeCreateLockout({ ...baseInput, duration: 1800 });

      expect(result?.lockedOutUntil).toStrictEqual(
        new Date(NOW.getTime() + 1800 * 1000),
      );
    });
  });
});
