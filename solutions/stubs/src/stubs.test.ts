import { expect, it, describe } from "vitest";
import { initStubs } from "./stubs.js";

describe("stubs", () => {
  it("handles errors with setErrorHandler and doesn't reveal error details", async () => {
    const fastify = await initStubs();

    fastify.get("/test-error", async () => {
      throw new Error("Test error");
    });

    const response = await fastify.inject({
      method: "GET",
      url: "/test-error",
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe("An error occurred");
  });
});
