import type { FastifyReply, FastifyRequest } from "fastify";
import * as v from "valibot";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { passkeysGetHandler, passkeysPostHandler } from "./passkeys.js";

// @ts-expect-error
vi.mock(import("../../../../commons/utils/constants.js"), () => ({
  passkeyDetailsSchema: v.object({}),
}));

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

  it("should return passkeys array for valid request", async () => {
    mockRequest.headers = { authorization: "Bearer token" };
    mockRequest.params = { publicSubjectId: "test-subject-id" };

    await passkeysGetHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(mockReply.send).toHaveBeenCalledWith({
      passkeys: [
        {
          credential: "fake-credential-1",
          id: "f5cf86e0-6eb5-4965-8c5e-2516b8f1c625",
          aaguid: "a0f53165-0e77-42d3-92cc-203d057562bb",
          isAttested: true,
          signCount: 1,
          transports: ["usb"],
          isBackUpEligible: false,
          isBackedUp: false,
          createdAt: "2026-01-25T19:04:16.341Z",
          lastUsedAt: "2026-02-08T09:33:10.341Z",
        },
        {
          credential: "fake-credential-2",
          id: "8518d6e1-a126-463f-b682-103b7f8b1852",
          aaguid: "00000000-0000-0000-0000-000000000000",
          isAttested: false,
          signCount: 0,
          transports: ["internal"],
          isBackUpEligible: true,
          isBackedUp: true,
          createdAt: "2026-01-19T19:04:16.341Z",
          lastUsedAt: "2026-02-25T20:06:19.341Z",
        },
      ],
    });
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
    mockRequest.body = {};

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
