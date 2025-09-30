import { expect, it, describe, afterEach } from "vitest";
import { resolveEnvVarToBool } from "./index.js";

describe("resolveEnvVarToBool", () => {
  const originalEnv = JSON.stringify(process.env);

  afterEach(() => {
    process.env = JSON.parse(originalEnv) as NodeJS.ProcessEnv;
  });

  it("returns true when env variable is '1'", () => {
    process.env["FAKE_ENV_VAR"] = "1";

    expect(resolveEnvVarToBool("FAKE_ENV_VAR")).toBe(true);
  });

  it("returns true when env variable is 'true'", () => {
    process.env["FAKE_ENV_VAR"] = "true";

    expect(resolveEnvVarToBool("FAKE_ENV_VAR")).toBe(true);
  });

  it("returns false when env variable is 'something else'", () => {
    process.env["FAKE_ENV_VAR"] = "something else";

    expect(resolveEnvVarToBool("FAKE_ENV_VAR")).toBe(false);
  });

  it("returns true when env variable is undefined", () => {
    expect(resolveEnvVarToBool("FAKE_ENV_VAR")).toBe(false);
  });
});
