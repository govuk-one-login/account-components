import { describe, expect, it } from "vitest";
import { getPath } from "./index.js";

describe("getPath", () => {
  it("should return root path without prefix", () => {
    const result = getPath("root");

    expect(result).toBe("/");
  });

  it("should return root path with prefix when withPrefix is true", () => {
    const result = getPath("root", true);

    expect(result).toBe("/stubs/");
  });

  it("should return root path without prefix when withPrefix is false", () => {
    const result = getPath("root", false);

    expect(result).toBe("/");
  });
});
