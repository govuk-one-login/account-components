import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { JourneyOutcomePayload } from "./interfaces.js";

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
  jti: "test-jti-456",
  sub: "test-sub-789",
};

const mockJourneyOutcome = {
  outcome_id: "test-outcome-123",
  sub: "test-sub-789",
  email: "test@example.com",
  outcome: [
    { scope: "test-scope", timestamp: 1234567890 },
    { scope: "another-scope", timestamp: 1234567891 },
  ],
};

describe("getJourneyOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["JOURNEY_OUTCOME_TABLE_NAME"] = "TestTable";

    vi.spyOn(mockErrorManager, "throwError").mockImplementation(() => {
      throw new Error("Mock error thrown");
    });
  });

  afterEach(() => {
    delete process.env["JOURNEY_OUTCOME_TABLE_NAME"];
  });

  it("should return the journey outcome when the item is found and sub matches", async () => {
    mockDynamoDbGet.mockResolvedValueOnce({
      Item: mockJourneyOutcome,
    });

    const result = await getJourneyOutcome(mockPayload);

    expect(result).toStrictEqual(mockJourneyOutcome);
    expect(mockDynamoDbGet).toHaveBeenCalledWith({
      TableName: "TestTable",
      Key: {
        outcome_id: "test-outcome-123",
      },
      ConsistentRead: true,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).not.toHaveBeenCalled();
  });

  it("should throw MissingOutcome error if the item does not exist", async () => {
    mockDynamoDbGet.mockResolvedValueOnce({
      Item: undefined,
    });

    await expect(getJourneyOutcome(mockPayload)).rejects.toThrowError(
      "Mock error thrown",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "MissingOutcome",
      "Missing outcome with outcome_id: test-outcome-123 and jti: test-jti-456",
    );
  });

  it("should throw FailedToFindOutcome error if the DynamoDB operation fails", async () => {
    const mockError = new Error("DB Connection Failed");
    mockDynamoDbGet.mockRejectedValueOnce(mockError);

    await expect(getJourneyOutcome(mockPayload)).rejects.toThrowError(
      "Mock error thrown",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "FailedToFindOutcome",
      "A problem occurred while retrieving the journey outcome: DB Connection Failed",
    );
  });

  it("should throw OutcomeSubDoesNotMatchPayload error if outcome sub does not match payload sub", async () => {
    const mismatchedJourneyOutcome = {
      ...mockJourneyOutcome,
      sub: "different-sub",
    };

    mockDynamoDbGet.mockResolvedValueOnce({
      Item: mismatchedJourneyOutcome,
    });

    await expect(getJourneyOutcome(mockPayload)).rejects.toThrowError(
      "Mock error thrown",
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockErrorManager.throwError).toHaveBeenCalledWith(
      "OutcomeSubDoesNotMatchPayload",
      "Outcome sub does not match payload sub with outcome_id: test-outcome-123 and jti: test-jti-456",
    );
  });
});
