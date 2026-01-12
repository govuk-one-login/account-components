import { describe, it, expect, vi, beforeEach } from "vitest";
import { addStaticAssetsCachingHeaders } from "./index.js";
import type fastifyStatic from "@fastify/static";

vi.mock(import("../../getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn(),
}));

describe("addStaticAssetsCachingHeaders", () => {
  const mockSetHeader = vi.fn();
  const mockRes = {
    setHeader: mockSetHeader,
  } as unknown as fastifyStatic.SetHeadersResponse;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when environment is not local", () => {
    beforeEach(async () => {
      const { getEnvironment } = await import("../../getEnvironment/index.js");
      vi.mocked(getEnvironment).mockReturnValue("production");
    });

    it("should set cache headers with default cache=true", () => {
      addStaticAssetsCachingHeaders(mockRes);

      expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
        "cache-control",
        "public, max-age=86400, immutable",
      );
    });

    it("should set cache headers when cache=true", () => {
      addStaticAssetsCachingHeaders(mockRes, true);

      expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
        "cache-control",
        "public, max-age=86400, immutable",
      );
    });

    it("should set no-cache headers when cache=false", () => {
      addStaticAssetsCachingHeaders(mockRes, false);

      expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
        "cache-control",
        "no-cache",
      );
    });
  });

  describe("when environment is local", () => {
    beforeEach(async () => {
      const { getEnvironment } = await import("../../getEnvironment/index.js");
      vi.mocked(getEnvironment).mockReturnValue("local");
    });

    it("should not set headers with default cache=true", () => {
      addStaticAssetsCachingHeaders(mockRes);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });

    it("should not set headers when cache=true", () => {
      addStaticAssetsCachingHeaders(mockRes, true);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });

    it("should not set headers when cache=false", () => {
      addStaticAssetsCachingHeaders(mockRes, false);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });
  });
});
