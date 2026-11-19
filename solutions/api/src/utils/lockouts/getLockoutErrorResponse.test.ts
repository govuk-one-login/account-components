import { describe, it, expect, vi, beforeEach } from "vitest";
import { Source, LockoutType } from "../../../../commons/utils/constants.js";

const mockGetLockouts = vi.fn();

vi.mock(import("./getLockouts.js"), () => ({
  getLockouts: mockGetLockouts,
}));

const { getLockoutErrorResponse } =
  await import("./getLockoutErrorResponse.js");

const publicSubjectId = "test-subject-id";
const source = Source["account-delete"];

describe("getLockoutErrorResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined when no lockouts exist", async () => {
    mockGetLockouts.mockResolvedValue([]);

    const result = await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutToCheckFor: LockoutType.TooManyOTPsRequested,
      errorCode: 1002,
    });

    expect(result).toBeUndefined();
  });

  it.each([
    [LockoutType.TooManyOTPsRequested, 1002],
    [LockoutType.TooManyIncorrectOTPsEntered, 1003],
    [LockoutType.TooManyIncorrectPasswordsEntered, 1004],
  ])(
    "returns 403 with code %s when locked out for %s",
    async (lockoutType, errorCode) => {
      mockGetLockouts.mockResolvedValue([{ id: "lockout-1" }]);

      const result = await getLockoutErrorResponse({
        publicSubjectId,
        source,
        lockoutToCheckFor: lockoutType,
        errorCode,
      });

      expect(result).toStrictEqual({
        statusCode: 403,
        body: JSON.stringify({ code: errorCode, message: lockoutType }),
      });
    },
  );

  it("calls getLockouts with the correct arguments", async () => {
    mockGetLockouts.mockResolvedValue([]);

    await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutToCheckFor: LockoutType.TooManyOTPsRequested,
      errorCode: 1002,
    });

    expect(mockGetLockouts).toHaveBeenCalledWith({
      publicSubjectId,
      source,
      type: LockoutType.TooManyOTPsRequested,
    });
  });
});
