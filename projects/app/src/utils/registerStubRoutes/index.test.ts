import { expect, it, describe, afterEach } from "vitest";
import { registerStubRoutes } from "./index.js";

describe("registerStubRoutes", () => {
  const originalEnv = process.env["REGISTER_STUB_ROUTES"];

  afterEach(() => {
    process.env["REGISTER_STUB_ROUTES"] = originalEnv;
  });

  it("returns true when REGISTER_STUB_ROUTES is '1'", () => {
    process.env["REGISTER_STUB_ROUTES"] = "1";

    expect(registerStubRoutes()).toBe(true);
  });

  it("returns false when REGISTER_STUB_ROUTES is '0'", () => {
    process.env["REGISTER_STUB_ROUTES"] = "0";

    expect(registerStubRoutes()).toBe(false);
  });

  it("returns false when REGISTER_STUB_ROUTES is undefined", () => {
    delete process.env["REGISTER_STUB_ROUTES"];

    expect(registerStubRoutes()).toBe(false);
  });

  it("returns false when REGISTER_STUB_ROUTES is non-numeric", () => {
    process.env["REGISTER_STUB_ROUTES"] = "invalid";

    expect(registerStubRoutes()).toBe(false);
  });

  it("returns true when REGISTER_STUB_ROUTES is any positive number", () => {
    process.env["REGISTER_STUB_ROUTES"] = "5";

    expect(registerStubRoutes()).toBe(true);
  });
});
