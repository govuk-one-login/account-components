import { describe, it, expect } from "vitest";
import { FastifyLogController } from "./index.js";

describe("fastifyLogController", () => {
  it("sets disableRequestLogging to true", () => {
    const controller = new FastifyLogController();

    expect(controller.disableRequestLogging).toBe(true);
  });
});
