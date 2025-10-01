import { expect, it, describe } from "vitest";
import { deleteAccount } from "./index.js";

describe("deleteAccount", () => {
  it("should be a function", () => {
    expect(deleteAccount).toBeTypeOf("function");
  });
});