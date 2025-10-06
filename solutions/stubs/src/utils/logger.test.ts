import { logger } from "./logger.js";
import { expect, describe, it, vi } from "vitest";

describe("logger", () => {
  it("exports logger", () => {
    const infoSpy = vi.spyOn(logger, "info");
    logger.info("test");

    expect(infoSpy).toHaveBeenCalledExactlyOnceWith("test");
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });
});
