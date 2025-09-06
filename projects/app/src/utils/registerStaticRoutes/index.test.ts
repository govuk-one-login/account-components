import { expect, it, describe, afterEach } from "vitest";
import { registerStaticRoutes } from "./index.js";

describe("registerStaticRoutes", () => {
  const originalEnv = process.env["REGISTER_STATIC_ROUTES"];

  afterEach(() => {
    process.env["REGISTER_STATIC_ROUTES"] = originalEnv;
  });

  it("returns true when REGISTER_STATIC_ROUTES is '1'", () => {
    process.env["REGISTER_STATIC_ROUTES"] = "1";

    expect(registerStaticRoutes()).toBe(true);
  });

  it("returns false when REGISTER_STATIC_ROUTES is '0'", () => {
    process.env["REGISTER_STATIC_ROUTES"] = "0";

    expect(registerStaticRoutes()).toBe(false);
  });

  it("returns false when REGISTER_STATIC_ROUTES is undefined", () => {
    delete process.env["REGISTER_STATIC_ROUTES"];

    expect(registerStaticRoutes()).toBe(false);
  });

  it("returns false when REGISTER_STATIC_ROUTES is non-numeric", () => {
    process.env["REGISTER_STATIC_ROUTES"] = "invalid";

    expect(registerStaticRoutes()).toBe(false);
  });

  it("returns true when REGISTER_STATIC_ROUTES is any positive number", () => {
    process.env["REGISTER_STATIC_ROUTES"] = "5";

    expect(registerStaticRoutes()).toBe(true);
  });
});
