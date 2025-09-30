import { expect, it, describe } from "vitest";
import { initFrontend } from "./frontend.js";

describe("frontend", () => {
  it("handles errors with setErrorHandler and doesn't reveal error details", async () => {
    const fastify = await initFrontend();

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
