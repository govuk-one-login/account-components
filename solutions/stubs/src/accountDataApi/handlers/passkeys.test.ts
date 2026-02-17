import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { passkeysGetHandler, passkeysPostHandler } from "./passkeys.js";

describe("passkeysGetHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      headers: {},
      params: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  it("should return 401 when authorization header is missing", async () => {
    await passkeysGetHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith();
  });

  it("should return empty passkeys array for valid request", async () => {
    mockRequest.headers = { authorization: "Bearer token" };
    mockRequest.params = { publicSubjectId: "test-subject-id" };

    await passkeysGetHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.send).toHaveBeenCalledWith({ passkeys: [] });
  });

  it("should throw error when publicSubjectId is missing", async () => {
    mockRequest.headers = { authorization: "Bearer token" };
    mockRequest.params = {};

    await expect(
      passkeysGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
      // eslint-disable-next-line vitest/require-to-throw-message
    ).rejects.toThrowError();
  });
});

describe("passkeysPostHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      headers: {},
      params: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  it("should return 401 when authorization header is missing", async () => {
    await passkeysPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.status).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith();
  });

  it("should return 201 for valid request", async () => {
    mockRequest.headers = { authorization: "Bearer token" };
    mockRequest.params = { publicSubjectId: "test-subject-id" };

    await passkeysPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith();
  });

  it("should throw error when publicSubjectId is missing", async () => {
    mockRequest.headers = { authorization: "Bearer token" };
    mockRequest.params = {};

    await expect(
      passkeysPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
      // eslint-disable-next-line vitest/require-to-throw-message
    ).rejects.toThrowError();
  });
});
