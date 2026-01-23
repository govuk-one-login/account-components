import type { Mock } from "vitest";
import { expect, it, describe, vi, afterEach, beforeEach } from "vitest";
import { onError } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { metrics } from "../../metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

// @ts-expect-error
vi.mock(import("../../metrics/index.js"), () => ({
  metrics: {
    addMetric: vi.fn(),
  },
}));

describe("onError handler", () => {
  let mockLog: {
    error: Mock;
  };
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockLog = {
      error: vi.fn(),
    };
    mockRequest = {
      log: mockLog,
    } as unknown as FastifyRequest;

    mockReply = {
      statusCode: 200,
      render: vi.fn(),
    } as unknown as FastifyReply;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs the error with correct message", async () => {
    const testError = new Error("Test error");

    await onError(testError, mockRequest, mockReply);

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith(
      testError,
      "Test error",
    );
  });

  it("logs unknown error for non-Error objects", async () => {
    const testError = "string error";

    await onError(testError, mockRequest, mockReply);

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith(
      testError,
      "An unknown error occurred",
    );
  });

  it("adds metric with error message", async () => {
    const testError = new Error("Test error");

    await onError(testError, mockRequest, mockReply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metrics.addMetric).toHaveBeenCalledExactlyOnceWith(
      "Test error",
      MetricUnit.Count,
      1,
    );
  });

  it("sets status code to 500", async () => {
    const testError = new Error("Test error");

    await onError(testError, mockRequest, mockReply);

    expect(mockReply.statusCode).toBe(500);
  });

  it("renders the default error template", async () => {
    const testError = new Error("Test error");

    await onError(testError, mockRequest, mockReply);

    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(
      "handlers/onError/index.njk",
    );
  });

  it("renders custom template when pathToTemplate is provided", async () => {
    const testError = new Error("Test error");
    const customTemplate = "custom/error/template.njk";

    await onError(testError, mockRequest, mockReply, customTemplate);

    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(customTemplate);
  });
});
