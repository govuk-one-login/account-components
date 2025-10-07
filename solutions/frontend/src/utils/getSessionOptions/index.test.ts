import { describe, expect, it, vi } from "vitest";
import { getSessionOptions } from "./index.js";
import { getEnvironment } from "../../../../commons/utils/getEnvironment/index.js";

vi.mock("../../../../commons/utils/getEnvironment/index.js", () => ({
  getEnvironment: vi.fn(),
}));

describe("getSessionOptions", () => {
  it("should return secure cookie when environment is not local", () => {
    vi.mocked(getEnvironment).mockReturnValue("production");

    const options = getSessionOptions();

    expect(options).toEqual({
      secret: [
        "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
      ],
      cookie: {
        secure: true,
        sameSite: "lax",
      },
    });
  });

  it("should return non-secure cookie when environment is local", () => {
    vi.mocked(getEnvironment).mockReturnValue("local");

    const options = getSessionOptions();

    expect(options).toEqual({
      secret: [
        "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
      ],
      cookie: {
        secure: false,
        sameSite: "lax",
      },
    });
  });
});
