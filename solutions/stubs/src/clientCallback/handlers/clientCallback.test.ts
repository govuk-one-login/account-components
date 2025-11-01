import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handler } from "./clientCallback.js";

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: vi.fn(),
}));

const mockGetClientRegistry = vi.fn();
vi.mocked(
  await import("../../../../commons/utils/getClientRegistry/index.js"),
).getClientRegistry = mockGetClientRegistry;

describe("clientCallback handler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: {},
      query: {},
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      log: {
        warn: vi.fn(),
      } as any,
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      render: vi.fn().mockReturnThis(),
    };
  });

  describe("parameter validation", () => {
    it("should return 400 when client parameter is missing", async () => {
      mockRequest.params = {};

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            path: expect.arrayContaining([
              expect.objectContaining({ key: "client" }),
            ]),
          }),
        ]),
      );
      expect(result).toBe(mockReply);
    });

    it("should return 400 when client parameter is not a string", async () => {
      mockRequest.params = { client: 123 };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            path: expect.arrayContaining([
              expect.objectContaining({ key: "client" }),
            ]),
          }),
        ]),
      );
      expect(result).toBe(mockReply);
    });
  });

  describe("client lookup", () => {
    beforeEach(() => {
      mockRequest.params = { client: "test-client" };
    });

    it("should return 404 when client is not found", async () => {
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "Other Client",
          client_id: "other-id",
        },
      ]);

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        "Client 'test-client' not found",
      );
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith();
      expect(result).toBe(mockReply);
    });

    it("should return 404 when client registry is empty", async () => {
      mockGetClientRegistry.mockResolvedValue([]);

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        "Client 'test-client' not found",
      );
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith();
      expect(result).toBe(mockReply);
    });

    it("should find client with case-insensitive matching", async () => {
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "Test-Client",
          client_id: "test-id",
        },
      ]);
      mockRequest.query = {};

      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "Test-Client (test-id)",
        },
      );
    });
  });

  describe("successful rendering", () => {
    beforeEach(() => {
      mockRequest.params = { client: "test-client" };
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "test-client",
          client_id: "test-id",
        },
      ]);
    });

    it("should render template with client info and no query params", async () => {
      mockRequest.query = {};

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render template with error query params", async () => {
      mockRequest.query = {
        error: "access_denied",
        error_description: "User denied access",
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          error: "access_denied",
          error_description: "User denied access",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render template with state query param", async () => {
      mockRequest.query = {
        state: "abc123",
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          state: "abc123",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should render template with all query params", async () => {
      mockRequest.query = {
        error: "invalid_request",
        error_description: "Invalid request parameters",
        state: "xyz789",
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          error: "invalid_request",
          error_description: "Invalid request parameters",
          state: "xyz789",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should ignore extra query params not in schema", async () => {
      mockRequest.query = {
        error: "access_denied",
        extra_param: "should_be_ignored",
        another_param: 123,
      };

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: "test-client (test-id)",
          error: "access_denied",
        },
      );
      expect(result).toBe(mockReply);
    });
  });

  describe("edge cases", () => {
    it("should handle getClientRegistry throwing an error", async () => {
      mockRequest.params = { client: "test-client" };
      mockGetClientRegistry.mockRejectedValue(new Error("Registry error"));

      await expect(
        handler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow("Registry error");
    });

    it("should handle empty client name in registry", async () => {
      mockRequest.params = { client: "" };
      mockGetClientRegistry.mockResolvedValue([
        {
          client_name: "",
          client_id: "empty-name-id",
        },
      ]);

      const result = await handler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "clientCallback/handlers/clientCallback.njk",
        {
          client: " (empty-name-id)",
        },
      );
      expect(result).toBe(mockReply);
    });
  });
});
