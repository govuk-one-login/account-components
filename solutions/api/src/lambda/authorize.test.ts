import { describe, it, expect } from "vitest";
import { handler } from "./authorize.js";

describe("authorize handler", () => {
  it("returns 200 status with authorized message", async () => {
    const result = await handler();

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "Authorized" }),
    });
  });
});
