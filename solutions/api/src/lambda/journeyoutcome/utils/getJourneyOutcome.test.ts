import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { JourneyOutcomePayload } from "./interfaces.js";
import type { JourneyOutcome } from "../../../../../commons/utils/interfaces.js";

const mockDynamoDbGet = vi.fn();

vi.doMock(
  "../../../../../commons/utils/awsClient/dynamodbClient/index.js",
  () => ({
    getDynamoDbClient: vi.fn(() => ({
      get: mockDynamoDbGet,
    })),
  }),
);

vi.doMock("./errors.js", () => ({
  errorManager: { throwError: vi.fn(() => undefined) },
}));

const { errorManager } = await import("./errors.js");
const mockErrorManager = vi.mocked(errorManager);

const { getJourneyOutcome } = await import("./getJourneyOutcome.js");

const mockPayload: JourneyOutcomePayload = {
  outcome_id: "test-outcome-123",
};

const mockOutcomeData: JourneyOutcome = [
  { step: 1, action: "start" },
  { step: 2, action: "complete" },
];

describe("getJourneyOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "TestTable";

    vi.spyOn(mockErrorManager, "throwError").mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    delete process.env["JOURNEY_OUTCOME_TABLE_NAME"];
  });

  it("should return the outcome array when the item is found", async () => {
    mockDynamoDbGet.mockResolvedValueOnce({
      Item: {
        outcome_id: mockPayload.outcome_id,
        outcome: mockOutcomeData,
        scope: "test-scope",
        sub: "test-sub",
      },
    });

    const result = await getJourneyOutcome(mockPayload);

    expect(result).toStrictEqual(mockOutcomeData);
    expect(mockDynamoDbGet).toHaveBeenCalledWith({
      TableName: "TestTable",
      Key: {
        outcome_id: "test-outcome-123",
      },
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).not.toHaveBeenCalled();
  });

  it("should return undefined if the item does not exist", async () => {
    mockDynamoDbGet.mockResolvedValueOnce({
      Item: undefined,
    });

    const result = await getJourneyOutcome(mockPayload);

    expect(result).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).not.toHaveBeenCalled();
  });

  it("should call errorManager.throwError if the DynamoDB operation fails", async () => {
    const mockError = new Error("DB Connection Failed");
    mockDynamoDbGet.mockRejectedValueOnce(mockError);

    const result = await getJourneyOutcome(mockPayload);

    expect(result).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "FailedToFindOutcome",
      expect.stringContaining(
        "A problem occurred while retrieving the journey outcome: DB Connection Failed",
      ),
    );
  });
});
