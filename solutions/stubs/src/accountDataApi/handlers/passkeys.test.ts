import { beforeEach, describe, it, expect, vi } from "vitest";
import { passkeysPostHandler } from "./passkeys.js";
import type { FastifyReply, FastifyRequest } from "fastify";

describe("passkeys handlers tests", () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;
  let replyStatusMock: ReturnType<typeof vi.fn>;
  let replySendMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    replyStatusMock = vi.fn();
    replySendMock = vi.fn();
    mockReply = {
      status: replyStatusMock,
      send: replySendMock,
    } as unknown as FastifyReply;
  });

  describe("passkeys post handler", async () => {
    it("should return 404 for non existing user", async () => {
      mockRequest = {
        params: {
          accountId: "non-existing",
        },
      } as unknown as FastifyRequest;
      await passkeysPostHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(404);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "User not found",
      });
    });

    it("should return 409 for existing passkey", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
        },
        body: {
          id: "passkey1",
          aaguid: "123e4567-e89b-12d3-a456-426614174000",
          attestationSignature: "attest",
          credential: "public-key",
        },
      } as unknown as FastifyRequest;
      await passkeysPostHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(409);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "Passkey already exists",
      });
    });
  });
});
