import { describe, it, expect, vi, beforeEach } from "vitest";
import { LockoutType, Source } from "../../../../commons/utils/constants.js";

const mockPut = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: vi.fn(() => ({ put: mockPut })),
  }),
);

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  randomUUID: vi.fn(() => "test-uuid"),
}));

const { createLockout } = await import("./createLockout.js");

const baseInput = {
  publicSubjectId: "sub-123",
  source: Source["account-delete"],
  type: LockoutType.TooManyOTPsRequested,
  lockedOutUntil: new Date("2025-01-01T00:10:00.000Z"),
};

describe("createLockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  it("calls dynamoDb.put with the correct item", async () => {
    process.env["LOCKOUTS_TABLE_NAME"] = "lockouts-table";

    await createLockout(baseInput);

    expect(mockPut).toHaveBeenCalledWith({
      TableName: "lockouts-table",
      Item: {
        id: "test-uuid",
        publicSubjectId: "sub-123",
        lockedOutAt: 1735689600,
        lockedOutUntil: 1735690200,
        source: Source["account-delete"],
        type: LockoutType.TooManyOTPsRequested,
      },
      ConditionExpression: "attribute_not_exists(id)",
    });
  });

  it("returns the lockout with Date objects for timestamps", async () => {
    const result = await createLockout(baseInput);

    expect(result.lockedOutAt).toStrictEqual(
      new Date("2025-01-01T00:00:00.000Z"),
    );
    expect(result.lockedOutUntil).toStrictEqual(
      new Date("2025-01-01T00:10:00.000Z"),
    );
  });

  it("returns the lockout with the correct fields", async () => {
    const result = await createLockout(baseInput);

    expect(result).toMatchObject({
      id: "test-uuid",
      publicSubjectId: "sub-123",
      source: Source["account-delete"],
      type: LockoutType.TooManyOTPsRequested,
    });
  });
});
