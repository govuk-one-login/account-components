import { describe, it, expect, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";

const mockSaveStubOutput = vi.fn();

vi.mock(import("../../utils/saveStubOutput.js"), () => ({
  saveStubOutput: mockSaveStubOutput,
}));

describe("notify handler", () => {
  const mockReply = {
    send: vi.fn().mockImplementation(() => mockReply),
  };

  it("saves the request and sends a reply", async () => {
    const { handler } = await import("./index.js");
    const mockRequest = { body: "test" } as unknown as FastifyRequest;

    const result = await handler(
      mockRequest,
      mockReply as unknown as FastifyReply,
    );

    expect(mockSaveStubOutput).toHaveBeenCalledExactlyOnceWith(mockRequest);
    expect(mockReply.send).toHaveBeenCalledExactlyOnceWith();
    expect(result).toBe(mockReply);
  });
});
