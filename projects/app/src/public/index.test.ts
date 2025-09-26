import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { publicRoutes } from "./index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import type { FastifyReply, FastifyRequest } from "fastify";

const ORIGINAL_ENV = { ...process.env };

describe("frontend", () => {
  let mockApp: FastifyTypeboxInstance;
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockSetNotFoundHandler: ReturnType<typeof vi.fn>;
  let mockSetErrorHandler: ReturnType<typeof vi.fn>;
  let mockGetHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn();
    mockSetNotFoundHandler = vi.fn();
    mockSetErrorHandler = vi.fn();
    mockGetHandler = vi.fn();

    mockApp = {
      register: mockRegister,
      setNotFoundHandler: mockSetNotFoundHandler,
      setErrorHandler: mockSetErrorHandler,
      get: mockGetHandler,
    } as unknown as FastifyTypeboxInstance;

    process.env["REGISTER_PUBLIC_STUB_ROUTES"] = "1";
    process.env["REGISTER_PUBLIC_STATIC_ROUTES"] = "1";
    process.env["REGISTER_PUBLIC_FRONTEND_ROUTES"] = "1";
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("not found handler dynamically imports and calls onNotFound", async () => {
    const mockOnNotFoundHandler = vi.fn();
    const mockOnNotFound = {
      bind: vi.fn().mockReturnValue(mockOnNotFoundHandler),
    };
    const mockRequest = {} as FastifyRequest;
    const mockReply = {} as FastifyReply;
    const mockThis = {};

    vi.doMock("./handlers/onNotFound/index.js", () => ({
      onNotFound: mockOnNotFound,
    }));

    await publicRoutes(mockApp);

    const notFoundHandler = mockSetNotFoundHandler.mock.calls[0]![0] as (
      ...args: any
    ) => any;
    await notFoundHandler.call(mockThis, mockRequest, mockReply);

    expect(mockOnNotFound.bind).toHaveBeenCalledWith(mockThis);
    expect(mockOnNotFoundHandler).toHaveBeenCalledWith(mockRequest, mockReply);
  });

  it("error handler dynamically imports and calls onError", async () => {
    const mockOnErrorHandler = vi.fn();
    const mockOnError = { bind: vi.fn().mockReturnValue(mockOnErrorHandler) };
    const mockError = new Error("test error");
    const mockRequest = {} as FastifyRequest;
    const mockReply = {} as FastifyReply;
    const mockThis = {};

    vi.doMock("./handlers/onError/index.js", () => ({
      onError: mockOnError,
    }));

    await publicRoutes(mockApp);

    const errorHandler = mockSetErrorHandler.mock.calls[0]![0] as (
      ...args: any
    ) => any;
    await errorHandler.call(mockThis, mockError, mockRequest, mockReply);

    expect(mockOnError.bind).toHaveBeenCalledWith(mockThis);
    expect(mockOnErrorHandler).toHaveBeenCalledWith(
      mockError,
      mockRequest,
      mockReply,
    );
  });

  it("healthcheck GET handler behaves as expected", async () => {
    const mockRequest = {};
    const mockReply = {
      send: vi.fn(),
    };
    const mockThis = {};

    await publicRoutes(mockApp);

    expect(mockGetHandler).toHaveBeenCalledWith(
      "/healthcheck",
      expect.any(Function),
    );

    const handler = mockGetHandler.mock.calls[0]![1] as (...args: any) => any;
    await handler.call(mockThis, mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith("ok");
  });
});
