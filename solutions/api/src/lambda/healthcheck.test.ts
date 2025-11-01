import { describe, it, expect } from "vitest";
import { handler } from "./healthcheck.js";

describe("healthcheck handler", () => {
  it("returns 200 status with ok body", async () => {
    const result = await handler();

    expect(result).toStrictEqual({
      statusCode: 200,
      body: '"ok"',
    });
  });
});
