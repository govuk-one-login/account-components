import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogger = {
  info: vi.fn(),
};

// @ts-expect-error
vi.mock(import("../../../commons/utils/logger/index.js"), () => ({
  logger: mockLogger,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("lambda-warmer", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ status: 200 });
  });

  it("makes fetch requests for each config concurrently", async () => {
    process.env["REQUESTS_CONFIG"] = JSON.stringify([
      {
        method: "GET",
        headers: {},
        url: "https://example.com/healthcheck",
        requestCount: 2,
      },
      {
        method: "POST",
        headers: { "x-healthcheck": "1" },
        url: "https://example.com/token",
        requestCount: 3,
      },
    ]);

    const { handler } = await import("./lambda-warmer.js");
    await handler();

    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/healthcheck", {
      method: "GET",
      headers: {},
    });
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/token", {
      method: "POST",
      headers: { "x-healthcheck": "1" },
    });
  });

  it("logs sending_warmup_requests with the config", async () => {
    const config = [
      {
        method: "GET",
        headers: {},
        url: "https://example.com/healthcheck",
        requestCount: 1,
      },
    ];
    process.env["REQUESTS_CONFIG"] = JSON.stringify(config);

    const { handler } = await import("./lambda-warmer.js");
    await handler();

    expect(mockLogger.info).toHaveBeenCalledWith("sending_warmup_requests", {
      requestsConfig: config,
    });
  });

  it("logs warmup_requests_complete with per-config status codes and rejected counts", async () => {
    process.env["REQUESTS_CONFIG"] = JSON.stringify([
      {
        method: "GET",
        headers: {},
        url: "https://example.com/healthcheck",
        requestCount: 3,
      },
      {
        method: "POST",
        headers: {},
        url: "https://example.com/token",
        requestCount: 2,
      },
    ]);

    mockFetch
      .mockResolvedValueOnce({ status: 200 })
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 });

    const { handler } = await import("./lambda-warmer.js");
    await handler();

    expect(mockLogger.info).toHaveBeenCalledWith("warmup_requests_complete", {
      summary: [
        {
          method: "GET",
          headers: {},
          url: "https://example.com/healthcheck",
          statusCodes: { 200: 1, 500: 1 },
          rejected: 1,
        },
        {
          method: "POST",
          headers: {},
          url: "https://example.com/token",
          statusCodes: { 200: 2 },
          rejected: 0,
        },
      ],
    });
  });

  it("throws when REQUESTS_CONFIG is invalid JSON", async () => {
    process.env["REQUESTS_CONFIG"] = "not-json";

    const { handler } = await import("./lambda-warmer.js");

    await expect(handler()).rejects.toThrow();
  });

  it("throws when REQUESTS_CONFIG fails schema validation", async () => {
    process.env["REQUESTS_CONFIG"] = JSON.stringify([
      { method: "GET", url: "not-a-url", requestCount: 1 },
    ]);

    const { handler } = await import("./lambda-warmer.js");

    await expect(handler()).rejects.toThrow();
  });

  it("makes no fetch calls when REQUESTS_CONFIG is an empty array", async () => {
    process.env["REQUESTS_CONFIG"] = JSON.stringify([]);

    const { handler } = await import("./lambda-warmer.js");
    await handler();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
