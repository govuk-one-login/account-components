import { expect, it, describe, afterEach } from "vitest";
import { registerFrontendRoutes } from "./index.js";

describe("registerFrontendRoutes", () => {
  const originalEnv = process.env["REGISTER_FRONTEND_ROUTES"];

  afterEach(() => {
    process.env["REGISTER_FRONTEND_ROUTES"] = originalEnv;
  });

  it("returns true when REGISTER_FRONTEND_ROUTES is '1'", () => {
    process.env["REGISTER_FRONTEND_ROUTES"] = "1";

    expect(registerFrontendRoutes()).toBe(true);
  });

  it("returns false when REGISTER_FRONTEND_ROUTES is '0'", () => {
    process.env["REGISTER_FRONTEND_ROUTES"] = "0";

    expect(registerFrontendRoutes()).toBe(false);
  });

  it("returns false when REGISTER_FRONTEND_ROUTES is undefined", () => {
    delete process.env["REGISTER_FRONTEND_ROUTES"];

    expect(registerFrontendRoutes()).toBe(false);
  });

  it("returns false when REGISTER_FRONTEND_ROUTES is non-numeric", () => {
    process.env["REGISTER_FRONTEND_ROUTES"] = "invalid";

    expect(registerFrontendRoutes()).toBe(false);
  });

  it("returns true when REGISTER_FRONTEND_ROUTES is any positive number", () => {
    process.env["REGISTER_FRONTEND_ROUTES"] = "5";

    expect(registerFrontendRoutes()).toBe(true);
  });
});
