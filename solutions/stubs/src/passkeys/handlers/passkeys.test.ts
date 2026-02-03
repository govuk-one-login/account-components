import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  passkeysGetHandler,
  passkeysPostHandler,
  passkeysDeleteHandler,
  passkeysPatchHandler,
} from "./passkeys.js";
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

  describe("passkeys get handler", async () => {
    it("should return 404 for non existing user", async () => {
      mockRequest = {
        params: {
          accountId: "non-existing",
        },
      } as unknown as FastifyRequest;
      await passkeysGetHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(404);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "User not found",
      });
    });

    it("should return passkeys for existing user", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
        },
      } as unknown as FastifyRequest;
      await passkeysGetHandler(mockRequest, mockReply);

      expect(replySendMock).toHaveBeenCalledWith({
        passkeys: [
          {
            type: "passkey",
            createdAt: "2023-10-01T12:00:00Z",
          },
          {
            type: "passkey",
            createdAt: "2023-11-15T08:30:00Z",
          },
        ],
      });
    });
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

  describe("passkeys delete handler", async () => {
    it("should return a 204 for existing passkey", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
          passkeyId: "passkey1",
        },
      } as unknown as FastifyRequest;
      await passkeysDeleteHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(204);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "Passkey deleted successfully",
      });
    });

    it("should return 404 for non existing passkey", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
          passkeyId: "non-existing",
        },
      } as unknown as FastifyRequest;
      await passkeysDeleteHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(404);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "Passkey not found",
      });
    });

    it("should return 404 for non existing user", async () => {
      mockRequest = {
        params: {
          accountId: "non-existing",
          passkeyId: "passkey1",
        },
      } as unknown as FastifyRequest;
      await passkeysDeleteHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(404);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "User not found",
      });
    });
  });

  describe("passkeys patch handler", async () => {
    it("should return 404 for non existing user", async () => {
      mockRequest = {
        params: {
          accountId: "non-existing",
          passkeyId: "passkey1",
        },
      } as unknown as FastifyRequest;
      await passkeysPatchHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(404);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "User not found",
      });
    });

    it("should return 404 for non existing passkey", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
          passkeyId: "non-existing",
        },
      } as unknown as FastifyRequest;
      await passkeysPatchHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(404);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "Passkey not found",
      });
    });

    it("should return 200 for existing passkey", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
          passkeyId: "passkey1",
        },
        body: {
          lastUsedAt: "1111",
        },
      } as unknown as FastifyRequest;
      await passkeysPatchHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(200);
      expect(replySendMock).toHaveBeenCalledWith({
        message: "Passkey updated successfully",
      });
    });

    it("should return 400 for invalid request body", async () => {
      mockRequest = {
        params: {
          accountId: "user1",
          passkeyId: "passkey1",
        },
        body: {
          invalidField: "1111",
        },
      } as unknown as FastifyRequest;
      await passkeysPatchHandler(mockRequest, mockReply);

      expect(replyStatusMock).toHaveBeenCalledWith(400);
      expect(replySendMock).toHaveBeenCalledWith({
        message: 'Invalid key: Expected "lastUsedAt" but received undefined',
      });
    });
  });
});
