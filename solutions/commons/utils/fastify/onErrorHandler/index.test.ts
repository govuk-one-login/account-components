import type { Mock } from "vitest";
import { expect, it, describe, vi, afterEach, beforeEach } from "vitest";
import { onError } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { metrics } from "../../metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { isFastifyError } from "../isFastifyError/index.js";

// @ts-expect-error
vi.mock(import("../../metrics/index.js"), () => ({
  metrics: {
    addMetric: vi.fn(),
  },
}));

vi.mock(import("../isFastifyError/index.js"));
const mockIsFastifyError = vi.mocked(isFastifyError);

describe("onError handler", () => {
  let mockLog: {
    error: Mock;
    warn: Mock;
  };
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockLog = {
      error: vi.fn(),
      warn: vi.fn(),
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
      "ERROR_CAUGHT_BY_GLOBAL_ERROR_HANDLER",
    );
  });

  it("adds metric with error message", async () => {
    const testError = new Error("Test error");

    await onError(testError, mockRequest, mockReply);

    expect(metrics.addMetric).toHaveBeenCalledExactlyOnceWith(
      "ERROR_CAUGHT_BY_GLOBAL_ERROR_HANDLER",
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

  describe("when error is a CSRF FastifyError", () => {
    const csrfError = {
      code: "FST_CSRF_INVALID_TOKEN",
      message: "Invalid CSRF token",
    };

    beforeEach(() => {
      mockIsFastifyError.mockReturnValue(true);
    });

    it("logs with warn", async () => {
      await onError(csrfError, mockRequest, mockReply);

      expect(mockLog.warn).toHaveBeenCalledExactlyOnceWith(
        csrfError,
        "ERROR_CAUGHT_BY_GLOBAL_ERROR_HANDLER",
      );
      expect(mockLog.error).not.toHaveBeenCalled();
    });

    it("sets status code to 403", async () => {
      await onError(csrfError, mockRequest, mockReply);

      expect(mockReply.statusCode).toBe(403);
    });
  });
});
