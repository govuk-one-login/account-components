import { describe, expect, it } from "vitest";
import { getPath } from "./index.js";

describe("getPath", () => {
  it("should return configure path without prefix", () => {
    const result = getPath("configure");

    expect(result).toBe("/configure");
  });

  it("should return configure path with prefix when withPrefix is true", () => {
    const result = getPath("configure", true);

    expect(result).toBe("/stubs/external-endpoints/configure");
  });

  it("should return configure path without prefix when withPrefix is false", () => {
    const result = getPath("configure", false);

    expect(result).toBe("/configure");
  });
});
