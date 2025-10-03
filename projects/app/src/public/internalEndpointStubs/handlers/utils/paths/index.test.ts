import { describe, expect, it } from "vitest";
import { getPath } from "./index.js";

describe("getPath", () => {
  it("should return generate-request-object path without prefix", () => {
    const result = getPath("requestObjectGenerator");

    expect(result).toBe("/generate-request-object");
  });

  it("should return generate-request-object path with prefix when withPrefix is true", () => {
    const result = getPath("requestObjectGenerator", true);

    expect(result).toBe("/stubs/internal-endpoints/generate-request-object");
  });

  it("should return root generate-request-object without prefix when withPrefix is false", () => {
    const result = getPath("requestObjectGenerator", false);

    expect(result).toBe("/generate-request-object");
  });
});
