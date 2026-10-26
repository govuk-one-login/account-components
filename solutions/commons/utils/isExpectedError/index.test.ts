import { describe, it, expect } from "vitest";
import { isExpectedError } from "./index.js";

describe("isExpectedError", () => {
  it("returns true for an object with an EXPECTED_ERROR_ prefixed code", () => {
    expect(
      isExpectedError({ code: "EXPECTED_ERROR_RESET_PASSWORD_INTERVENTION" }),
    ).toBe(true);
  });

  it("returns true for an object with an EXPECTED_ERROR_ prefixed code and a statusCode", () => {
    expect(
      isExpectedError({
        code: "EXPECTED_ERROR_RESET_PASSWORD_INTERVENTION",
        statusCode: 403,
      }),
    ).toBe(true);
  });

  it("returns false for a standard Error", () => {
    expect(isExpectedError(new Error("oops"))).toBe(false);
  });

  it("returns false when code does not start with EXPECTED_ERROR_", () => {
    expect(isExpectedError({ code: "OTHER_ERROR" })).toBe(false);
  });

  it("returns false when code is not a string", () => {
    expect(isExpectedError({ code: 123 })).toBe(false);
  });

  it("returns false when code property is missing", () => {
    expect(isExpectedError({ message: "no code" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isExpectedError(null)).toBe(false);
  });

  it("returns false for a non-object", () => {
    expect(isExpectedError("not an object")).toBe(false);
  });
});
