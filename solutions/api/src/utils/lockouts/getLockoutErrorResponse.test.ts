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

  it("returns undefined when no lockouts exist for any type", async () => {
    mockGetLockouts.mockResolvedValue([]);

    const result = await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutsToCheckFor: [
        LockoutType.TooManyOTPsRequested,
        LockoutType.TooManyIncorrectOTPsEntered,
        LockoutType.TooManyIncorrectPasswordsEntered,
      ],
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined when lockoutsToCheckFor is empty", async () => {
    const result = await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutsToCheckFor: [],
    });

    expect(result).toBeUndefined();
    expect(mockGetLockouts).not.toHaveBeenCalled();
  });

  it.each([
    [LockoutType.TooManyOTPsRequested, 1002],
    [LockoutType.TooManyIncorrectOTPsEntered, 1003],
    [LockoutType.TooManyIncorrectPasswordsEntered, 1004],
  ])(
    "returns 403 with code %s when locked out for %s",
    async (lockoutType, expectedCode) => {
      mockGetLockouts.mockResolvedValue([{ id: "lockout-1" }]);

      const result = await getLockoutErrorResponse({
        publicSubjectId,
        source,
        lockoutsToCheckFor: [lockoutType],
      });

      expect(result).toStrictEqual({
        statusCode: 403,
        body: JSON.stringify({ code: expectedCode, message: lockoutType }),
      });
    },
  );

  it("returns on the first lockout type that matches", async () => {
    mockGetLockouts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "lockout-1" }]);

    const result = await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutsToCheckFor: [
        LockoutType.TooManyOTPsRequested,
        LockoutType.TooManyIncorrectOTPsEntered,
      ],
    });

    expect(mockGetLockouts).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual({
      statusCode: 403,
      body: JSON.stringify({
        code: 1003,
        message: LockoutType.TooManyIncorrectOTPsEntered,
      }),
    });
  });

  it("does not check remaining types after finding a lockout", async () => {
    mockGetLockouts.mockResolvedValueOnce([{ id: "lockout-1" }]);

    await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutsToCheckFor: [
        LockoutType.TooManyOTPsRequested,
        LockoutType.TooManyIncorrectOTPsEntered,
      ],
    });

    expect(mockGetLockouts).toHaveBeenCalledTimes(1);
  });

  it("calls getLockouts with the correct arguments", async () => {
    mockGetLockouts.mockResolvedValue([]);

    await getLockoutErrorResponse({
      publicSubjectId,
      source,
      lockoutsToCheckFor: [LockoutType.TooManyOTPsRequested],
    });

    expect(mockGetLockouts).toHaveBeenCalledWith({
      publicSubjectId,
      source,
      type: LockoutType.TooManyOTPsRequested,
    });
  });
});
