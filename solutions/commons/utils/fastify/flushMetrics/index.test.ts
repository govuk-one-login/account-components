import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushMetrics } from "./index.js";
import { metrics } from "../../metrics/index.js";

describe("flushMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls metrics.publishStoredMetrics", async () => {
    const publishSpy = vi.spyOn(metrics, "publishStoredMetrics");

    await flushMetrics();

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });
});
