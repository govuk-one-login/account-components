import { describe, it, expect, vi, beforeEach } from "vitest";
import { Source, oneYearInSeconds } from "../../../commons/utils/constants.js";

const mockQuery = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({ query: mockQuery }),
  }),
);

const { getLatestOtp } = await import("./getLatestOtp.js");

const publicSubjectId = "test-subject-id";
const FAKE_NOW_S = 1_700_000_000;

const makeOtpItem = (overrides = {}) => ({
  id: "otp-1",
  publicSubjectId,
  createdAt: FAKE_NOW_S - 60,
  source: Source["account-delete"],
  used: false,
  keepUntil: FAKE_NOW_S + oneYearInSeconds,
  expiresAt: FAKE_NOW_S + 600,
  otp: "123456",
  ...overrides,
});

describe("getLatestOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["OTPS_TABLE_NAME"] = "otps-table";
    process.env["OTPS_TABLE_PUBLIC_SUBJECT_ID_INDEX_NAME"] = "otps-gsi";
  });

  it("queries with correct parameters", async () => {
    mockQuery.mockResolvedValue({ Items: [] });

    await getLatestOtp({ publicSubjectId, source: Source["account-delete"] });

    expect(mockQuery).toHaveBeenCalledWith({
      TableName: "otps-table",
      IndexName: "otps-gsi",
      KeyConditionExpression: "publicSubjectId = :publicSubjectId",
      FilterExpression: "#source = :source",
      ExpressionAttributeValues: {
        ":publicSubjectId": publicSubjectId,
        ":source": Source["account-delete"],
      },
      ExpressionAttributeNames: {
        "#source": "source",
      },
      ScanIndexForward: false,
    });
  });

  it("returns the first item when results exist", async () => {
    const first = makeOtpItem({ id: "otp-1" });
    const second = makeOtpItem({ id: "otp-2" });
    mockQuery.mockResolvedValue({ Items: [first, second] });

    const result = await getLatestOtp({
      publicSubjectId,
      source: Source["account-delete"],
    });

    expect(result).toStrictEqual(expect.objectContaining({ id: "otp-1" }));
  });

  it("returns undefined when no items found", async () => {
    mockQuery.mockResolvedValue({ Items: [] });

    const result = await getLatestOtp({
      publicSubjectId,
      source: Source["account-delete"],
    });

    expect(result).toBeUndefined();
  });

  it("throws when items fail schema validation", async () => {
    mockQuery.mockResolvedValue({ Items: [{ id: { S: "bad-item" } }] });

    await expect(
      getLatestOtp({ publicSubjectId, source: Source["account-delete"] }),
    ).rejects.toThrow();
  });
});
