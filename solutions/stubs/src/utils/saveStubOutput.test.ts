import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPut = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: () => ({ put: mockPut }),
  }),
);

// @ts-expect-error
vi.mock(import("node:crypto"), () => ({
  randomUUID: () => "test-uuid",
}));

describe("saveStubOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    process.env["STUBS_OUTPUTS_TABLE_NAME"] = "test-table";
  });

  it("puts the output into DynamoDB with the correct item shape", async () => {
    const { saveStubOutput } = await import("./saveStubOutput.js");

    const output = { body: "test" };
    await saveStubOutput(output);

    const now = Math.floor(Date.now() / 1000);

    expect(mockPut).toHaveBeenCalledExactlyOnceWith({
      TableName: "test-table",
      Item: {
        id: "test-uuid",
        allItemsId: "an_item",
        createdAt: now,
        expiresAt: now + 86400,
        output,
      },
    });
  });
});
