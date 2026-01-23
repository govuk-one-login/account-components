import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Claims } from "../../../../commons/utils/authorize/getClaimsSchema.js";
import type { FastifySessionObject } from "@fastify/session";

const mockCompleteJourney = vi.fn();

vi.mock(import("../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

// @ts-expect-error
vi.mock(import("../../utils/paths.js"), () => ({
  paths: {
    journeys: {
      "testing-journey": {
        PASSWORD_NOT_PROVIDED: {
          step1: { path: "/testing-journey/step-1" },
          enterPassword: { path: "/testing-journey/enter-password" },
        },
        PASSWORD_PROVIDED: {
          confirm: { path: "/testing-journey/confirm" },
        },
      },
    },
  },
}));

const {
  step1GetHandler,
  step1PostHandler,
  enterPasswordGetHandler,
  enterPasswordPostHandler,
  confirmGetHandler,
  confirmPostHandler,
} = await import("./handlers.js");

describe("testing-journey handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
      redirect: vi.fn().mockReturnThis(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      journeyStates: {
        "testing-journey": {
          send: vi.fn(),
        },
      } as any,
    };
  });

  describe("step1GetHandler", () => {
    it("should render step1 template", async () => {
      const result = await step1GetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/testing-journey/step1.njk",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        step1GetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("step1PostHandler", () => {
    it("should redirect to enter password page", async () => {
      const result = await step1PostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/testing-journey/enter-password",
      );
      expect(result).toBe(mockReply);
    });
  });

  describe("enterPasswordGetHandler", () => {
    it("should render enter password template with back link", async () => {
      const result = await enterPasswordGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/testing-journey/enterPassword.njk",
        {
          backLink: "/testing-journey/step-1",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        enterPasswordGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("enterPasswordPostHandler", () => {
    it("should send passwordEntered event and redirect to confirm", async () => {
      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        mockReply.journeyStates?.["testing-journey"]?.send,
      ).toHaveBeenCalledWith({
        type: "passwordEntered",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/testing-journey/confirm",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if journey state is not available", async () => {
      delete mockReply.journeyStates;

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw if testing-journey state is not available", async () => {
      mockReply.journeyStates = {};

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("confirmGetHandler", () => {
    it("should render confirm template", async () => {
      const result = await confirmGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/testing-journey/confirm.njk",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        confirmGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("confirmPostHandler", () => {
    it("should complete journey with testing outcome", async () => {
      const mockClaims = { sub: "user123", client_id: "test-client" };
      mockRequest.session = {
        claims: mockClaims as Claims,
      } as FastifySessionObject;
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await confirmPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        mockClaims,
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if session claims are not available", async () => {
      mockRequest.session = {} as FastifySessionObject;

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw if session is not available", async () => {
      delete mockRequest.session;

      await expect(
        confirmPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });
});
