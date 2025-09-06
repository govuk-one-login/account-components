import { expect, it, describe, afterEach } from "vitest";
import { registerApiRoutes } from "./index.js";

describe("registerApiRoutes", () => {
  const originalEnv = process.env["REGISTER_API_ROUTES"];

  afterEach(() => {
    process.env["REGISTER_API_ROUTES"] = originalEnv;
  });

  it("returns true when REGISTER_API_ROUTES is '1'", () => {
    process.env["REGISTER_API_ROUTES"] = "1";

    expect(registerApiRoutes()).toBe(true);
  });

  it("returns false when REGISTER_API_ROUTES is '0'", () => {
    process.env["REGISTER_API_ROUTES"] = "0";

    expect(registerApiRoutes()).toBe(false);
  });

  it("returns false when REGISTER_API_ROUTES is undefined", () => {
    delete process.env["REGISTER_API_ROUTES"];

    expect(registerApiRoutes()).toBe(false);
  });

  it("returns false when REGISTER_API_ROUTES is non-numeric", () => {
    process.env["REGISTER_API_ROUTES"] = "invalid";

    expect(registerApiRoutes()).toBe(false);
  });

  it("returns true when REGISTER_API_ROUTES is any positive number", () => {
    process.env["REGISTER_API_ROUTES"] = "5";

    expect(registerApiRoutes()).toBe(true);
  });
});
