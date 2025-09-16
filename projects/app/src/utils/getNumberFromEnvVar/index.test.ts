import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getNumberFromEnvVar } from "./index.js";

describe("getNumberFromEnvVar", () => {
  let originalEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return the default value if the environment variable is not set", () => {
    const result = getNumberFromEnvVar("NON_EXISTENT_ENV_VAR", 42);
    expect(result).toBe(42);
  });

  it("should return the parsed integer value of the environment variable if it is set", () => {
    process.env["TEST_ENV_VAR"] = "100";
    const result = getNumberFromEnvVar("TEST_ENV_VAR", 42);
    expect(result).toBe(100);
  });

  it("should throw an error if the environment variable is not a valid number", () => {
    process.env["INVALID_ENV_VAR"] = "not_a_number";
    expect(() => getNumberFromEnvVar("INVALID_ENV_VAR", 42)).toThrow(
      "INVALID_ENV_VAR is not a number",
    );
  });
});
