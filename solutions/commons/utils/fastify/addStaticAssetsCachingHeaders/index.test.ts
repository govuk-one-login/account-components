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

  it("should set cache headers when environment is not local", async () => {
    const { getEnvironment } = await import("../../getEnvironment/index.js");
    vi.mocked(getEnvironment).mockReturnValue("production");

    addStaticAssetsCachingHeaders(mockRes);

    expect(mockSetHeader).toHaveBeenCalledExactlyOnceWith(
      "cache-control",
      "public, max-age=86400, immutable",
    );
  });

  it("should not set cache headers when environment is local", async () => {
    const { getEnvironment } = await import("../../getEnvironment/index.js");
    vi.mocked(getEnvironment).mockReturnValue("local");

    addStaticAssetsCachingHeaders(mockRes);

    expect(mockSetHeader).not.toHaveBeenCalled();
  });
});
