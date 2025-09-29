import { expect, it, describe, vi, beforeEach } from "vitest";
import { staticFiles } from "./index.js";
import type { FastifyTypeboxInstance } from "../../app.js";

describe("staticFiles", () => {
  let mockApp: FastifyTypeboxInstance;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn();
    mockApp = {
      register: mockRegister,
    } as unknown as FastifyTypeboxInstance;
  });

  it("registers three static file routes with correct configurations", () => {
    staticFiles(mockApp);

    expect(mockRegister).toHaveBeenCalledTimes(3);

    expect(mockRegister).toHaveBeenNthCalledWith(1, expect.any(Function), {
      root: expect.stringContaining("static/full-cache"),
      prefix: "/full-cache",
      cacheControl: false,
      setHeaders: expect.any(Function),
    });

    expect(mockRegister).toHaveBeenNthCalledWith(2, expect.any(Function), {
      root: expect.stringContaining("static/shared-cache"),
      prefix: "/shared-cache",
      decorateReply: false,
      cacheControl: false,
      setHeaders: expect.any(Function),
    });

    expect(mockRegister).toHaveBeenNthCalledWith(3, expect.any(Function), {
      root: expect.stringContaining("static"),
      prefix: "/",
      decorateReply: false,
      cacheControl: false,
      setHeaders: expect.any(Function),
    });
  });

  it("sets correct cache headers for full-cache route", () => {
    staticFiles(mockApp);

    const fullCacheConfig = mockRegister.mock.calls[0]![1] as {
      setHeaders: (...args: any) => any;
    };
    const mockRes = { setHeader: vi.fn() };

    fullCacheConfig.setHeaders(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "cache-control",
      "public, max-age=31536000, immutable",
    );
  });

  it("sets correct cache headers for shared-cache route", () => {
    staticFiles(mockApp);

    const sharedCacheConfig = mockRegister.mock.calls[1]![1] as {
      setHeaders: (...args: any) => any;
    };
    const mockRes = { setHeader: vi.fn() };

    sharedCacheConfig.setHeaders(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "cache-control",
      "public, s-maxage=31536000, immutable",
    );
  });

  it("sets correct cache headers for default route", () => {
    staticFiles(mockApp);

    const defaultConfig = mockRegister.mock.calls[2]![1] as {
      setHeaders: (...args: any) => any;
    };

    const mockRes = { setHeader: vi.fn() };

    defaultConfig.setHeaders(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith("cache-control", "no-cache");
  });
});
