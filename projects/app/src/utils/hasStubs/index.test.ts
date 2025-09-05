import { expect, it, describe, afterEach } from "vitest";
import { hasStubs } from "./index.js";

describe("hasStubs", () => {
  const originalEnv = process.env["HAS_STUBS"];

  afterEach(() => {
    process.env["HAS_STUBS"] = originalEnv;
  });

  it("returns true when HAS_STUBS is '1'", () => {
    process.env["HAS_STUBS"] = "1";

    expect(hasStubs()).toBe(true);
  });

  it("returns false when HAS_STUBS is '0'", () => {
    process.env["HAS_STUBS"] = "0";

    expect(hasStubs()).toBe(false);
  });

  it("returns false when HAS_STUBS is undefined", () => {
    delete process.env["HAS_STUBS"];

    expect(hasStubs()).toBe(false);
  });

  it("returns false when HAS_STUBS is non-numeric", () => {
    process.env["HAS_STUBS"] = "invalid";

    expect(hasStubs()).toBe(false);
  });

  it("returns true when HAS_STUBS is any positive number", () => {
    process.env["HAS_STUBS"] = "5";

    expect(hasStubs()).toBe(true);
  });
});
