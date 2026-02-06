import { describe, it, expect } from "vitest";
import { getUsers } from "./common.js";

describe("getUsers", () => {
  it("should return empty user data for non_existent user", () => {
    const result = getUsers("non_existent");

    expect(result).toStrictEqual({
      sub: "",
      public_sub: "",
      email: "",
    });
  });

  it("should return default user data for any other user", () => {
    const result = getUsers("default");

    expect(result).toStrictEqual({
      sub: "urn:fdc:gov.uk:default",
      public_sub: "4c950955-03c3-45a4-a97e-763152c172ff",
      email: "testuser@test.null.local",
    });
  });

  it("should return default user data for unknown user types", () => {
    const result = getUsers("unknown_user");

    expect(result).toStrictEqual({
      sub: "urn:fdc:gov.uk:default",
      public_sub: "4c950955-03c3-45a4-a97e-763152c172ff",
      email: "testuser@test.null.local",
    });
  });
});
