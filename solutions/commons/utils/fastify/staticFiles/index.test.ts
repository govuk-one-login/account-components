import { expect, it, describe, vi, beforeEach } from "vitest";
import { staticFiles } from "./index.js";
import type { FastifyTypeboxInstance } from "../../../../frontend/src/frontend.js";

describe("staticFiles", () => {
  let mockFastify: FastifyTypeboxInstance;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn();
    mockFastify = {
      register: mockRegister,
    } as unknown as FastifyTypeboxInstance;
  });

  it("registers three static file routes with correct configurations", () => {
    staticFiles(mockFastify);

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
    staticFiles(mockFastify);

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
    staticFiles(mockFastify);

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
    staticFiles(mockFastify);

    const defaultConfig = mockRegister.mock.calls[2]![1] as {
      setHeaders: (...args: any) => any;
    };

    const mockRes = { setHeader: vi.fn() };

    defaultConfig.setHeaders(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith("cache-control", "no-cache");
  });
});
