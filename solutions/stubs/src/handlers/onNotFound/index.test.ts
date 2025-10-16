import { expect, it, describe, vi, afterEach, beforeEach } from "vitest";
import { onNotFound } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("onNotFound handler", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    mockRequest = {} as unknown as FastifyRequest;

    mockReply = {
      statusCode: 200,
      render: vi.fn(),
    } as unknown as FastifyReply;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets status code to 404", async () => {
    await onNotFound(mockRequest, mockReply);

    expect(mockReply.statusCode).toBe(404);
  });

  it("renders the not found template", async () => {
    await onNotFound(mockRequest, mockReply);

    expect(mockReply.render).toHaveBeenCalledExactlyOnceWith(
      "handlers/onNotFound/index.njk",
    );
  });
});
