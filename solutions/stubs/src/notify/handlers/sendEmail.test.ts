import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmailPostHandler } from "./sendEmail.js";

vi.mock(import("../../../../commons/utils/logger/index.js"));

describe("sendEmailPostHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReply = {
      send: vi.fn().mockReturnThis(),
    };
  });

  it("should return id and reference when reference is provided", async () => {
    mockRequest = {
      body: { template_id: "test-template-id", reference: "test-reference" },
    };

    await sendEmailPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.send).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        reference: "test-reference",
      },
    });
  });

  it("should return id and undefined reference when reference is not provided", async () => {
    mockRequest = { body: { template_id: "test-template-id" } };

    await sendEmailPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.send).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        reference: undefined,
      },
    });
  });

  it("should throw when body is invalid", async () => {
    mockRequest = { body: { template_id: 123 } };

    await expect(
      sendEmailPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow();
  });
});
