import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushMetrics } from "./index.js";
import { metrics } from "../../metrics/index.js";

describe("flushMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls captureColdStartMetric and publishStoredMetrics", () => {
    const coldStartSpy = vi.spyOn(metrics, "captureColdStartMetric");
    const publishSpy = vi.spyOn(metrics, "publishStoredMetrics");

    flushMetrics();

    expect(coldStartSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });
});
