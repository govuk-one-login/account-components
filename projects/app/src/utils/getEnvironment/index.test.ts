import { expect, it, describe, afterEach } from "vitest";
import { getEnvironment } from "./index.js";

describe("getEnvironment", () => {
  const originalEnv = process.env["ENVIRONMENT"];

  afterEach(() => {
    process.env["ENVIRONMENT"] = originalEnv;
  });

  it("returns 'dev' when ENVIRONMENT is 'dev'", () => {
    process.env["ENVIRONMENT"] = "dev";

    expect(getEnvironment()).toBe("dev");
  });

  it("returns 'build' when ENVIRONMENT is 'build'", () => {
    process.env["ENVIRONMENT"] = "build";

    expect(getEnvironment()).toBe("build");
  });

  it("returns 'staging' when ENVIRONMENT is 'staging'", () => {
    process.env["ENVIRONMENT"] = "staging";

    expect(getEnvironment()).toBe("staging");
  });

  it("returns 'integration' when ENVIRONMENT is 'integration'", () => {
    process.env["ENVIRONMENT"] = "integration";

    expect(getEnvironment()).toBe("integration");
  });

  it("returns 'production' when ENVIRONMENT is 'production'", () => {
    process.env["ENVIRONMENT"] = "production";

    expect(getEnvironment()).toBe("production");
  });

  it("returns 'local' when ENVIRONMENT is undefined", () => {
    delete process.env["ENVIRONMENT"];

    expect(getEnvironment()).toBe("local");
  });

  it("returns 'local' when ENVIRONMENT is an invalid value", () => {
    process.env["ENVIRONMENT"] = "invalid";

    expect(getEnvironment()).toBe("local");
  });
});
