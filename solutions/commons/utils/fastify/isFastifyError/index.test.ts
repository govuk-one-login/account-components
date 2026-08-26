import { describe, it, expect } from "vitest";
import { isFastifyError } from "./index.js";

describe("isFastifyError", () => {
  it("returns true for an object with an FST_ prefixed code", () => {
    expect(isFastifyError({ code: "FST_CSRF_INVALID_TOKEN" })).toBe(true);
  });

  it("returns false for a standard Error", () => {
    expect(isFastifyError(new Error("oops"))).toBe(false);
  });

  it("returns false when code does not start with FST_", () => {
    expect(isFastifyError({ code: "OTHER_ERROR" })).toBe(false);
  });

  it("returns false when code is not a string", () => {
    expect(isFastifyError({ code: 123 })).toBe(false);
  });

  it("returns false when code property is missing", () => {
    expect(isFastifyError({ message: "no code" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isFastifyError(null)).toBe(false);
  });

  it("returns false for a non-object", () => {
    expect(isFastifyError("FST_error")).toBe(false);
  });
});
