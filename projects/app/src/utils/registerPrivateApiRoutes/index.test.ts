import { expect, it, describe, afterEach } from "vitest";
import { registerPrivateApiRoutes } from "./index.js";

describe("registerPrivateApiRoutes", () => {
  const originalEnv = process.env["REGISTER_PRIVATE_API_ROUTES"];

  afterEach(() => {
    process.env["REGISTER_PRIVATE_API_ROUTES"] = originalEnv;
  });

  it("returns true when REGISTER_PRIVATE_API_ROUTES is '1'", () => {
    process.env["REGISTER_PRIVATE_API_ROUTES"] = "1";

    expect(registerPrivateApiRoutes()).toBe(true);
  });

  it("returns false when REGISTER_PRIVATE_API_ROUTES is '0'", () => {
    process.env["REGISTER_PRIVATE_API_ROUTES"] = "0";

    expect(registerPrivateApiRoutes()).toBe(false);
  });

  it("returns false when REGISTER_PRIVATE_API_ROUTES is undefined", () => {
    delete process.env["REGISTER_PRIVATE_API_ROUTES"];

    expect(registerPrivateApiRoutes()).toBe(false);
  });

  it("returns false when REGISTER_PRIVATE_API_ROUTES is non-numeric", () => {
    process.env["REGISTER_PRIVATE_API_ROUTES"] = "invalid";

    expect(registerPrivateApiRoutes()).toBe(false);
  });

  it("returns true when REGISTER_PRIVATE_API_ROUTES is any positive number", () => {
    process.env["REGISTER_PRIVATE_API_ROUTES"] = "5";

    expect(registerPrivateApiRoutes()).toBe(true);
  });
});
