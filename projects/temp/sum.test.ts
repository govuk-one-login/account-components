import { expect, it, describe } from "vitest";
import { sum } from "./sum.js";

describe("test sum", () => {
  it("adds 1 + 2 to equal 3", () => {
    expect(sum(1, 2)).toBe(3);
  });
});
