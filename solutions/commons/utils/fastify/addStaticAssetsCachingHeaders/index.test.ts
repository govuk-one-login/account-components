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

    it("should set short cache headers with default allUrlsAreImmutable=false", () => {
      addStaticAssetsCachingHeaders(mockRes);

      expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
        "cache-control",
        "public, max-age=300",
      );
    });

    it("should set immutable cache headers when allUrlsAreImmutable=true", () => {
      addStaticAssetsCachingHeaders(mockRes, true);

      expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
        "cache-control",
        "public, max-age=86400, immutable",
      );
    });

    it("should set short cache headers when allUrlsAreImmutable=false", () => {
      addStaticAssetsCachingHeaders(mockRes, false);

      expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
        "cache-control",
        "public, max-age=300",
      );
    });
  });

  describe("when environment is local", () => {
    beforeEach(async () => {
      const { getEnvironment } = await import("../../getEnvironment/index.js");
      vi.mocked(getEnvironment).mockReturnValue("local");
    });

    it("should not set headers with default allUrlsAreImmutable=false", () => {
      addStaticAssetsCachingHeaders(mockRes);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });

    it("should not set headers when allUrlsAreImmutable=true", () => {
      addStaticAssetsCachingHeaders(mockRes, true);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });

    it("should not set headers when allUrlsAreImmutable=false", () => {
      addStaticAssetsCachingHeaders(mockRes, false);

      expect(mockSetHeader).not.toHaveBeenCalled();
    });
  });
});
