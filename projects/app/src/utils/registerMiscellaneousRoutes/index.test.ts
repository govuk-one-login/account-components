import { expect, it, describe, afterEach } from "vitest";
import { registerMiscellaneousRoutes } from "./index.js";

describe("registerMiscellaneousRoutes", () => {
  const originalEnv = process.env["REGISTER_MISC_ROUTES"];

  afterEach(() => {
    process.env["REGISTER_MISC_ROUTES"] = originalEnv;
  });

  it("returns true when REGISTER_MISC_ROUTES is '1'", () => {
    process.env["REGISTER_MISC_ROUTES"] = "1";

    expect(registerMiscellaneousRoutes()).toBe(true);
  });

  it("returns false when REGISTER_MISC_ROUTES is '0'", () => {
    process.env["REGISTER_MISC_ROUTES"] = "0";

    expect(registerMiscellaneousRoutes()).toBe(false);
  });

  it("returns false when REGISTER_MISC_ROUTES is undefined", () => {
    delete process.env["REGISTER_MISC_ROUTES"];

    expect(registerMiscellaneousRoutes()).toBe(false);
  });

  it("returns false when REGISTER_MISC_ROUTES is non-numeric", () => {
    process.env["REGISTER_MISC_ROUTES"] = "invalid";

    expect(registerMiscellaneousRoutes()).toBe(false);
  });

  it("returns true when REGISTER_MISC_ROUTES is any positive number", () => {
    process.env["REGISTER_MISC_ROUTES"] = "5";

    expect(registerMiscellaneousRoutes()).toBe(true);
  });
});
