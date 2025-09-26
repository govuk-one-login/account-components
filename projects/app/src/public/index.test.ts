import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { publicRoutes } from "./index.js";
import type { FastifyTypeboxInstance } from "../app.js";
import type { FastifyReply, FastifyRequest } from "fastify";

vi.mock("@fastify/cookie");
vi.mock("../utils/nunjucksRender/index.js");
vi.mock("../utils/setUpI18n/index.js");

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers all required plugins", async () => {
    const { default: fastifyCookie } = await import("@fastify/cookie");
    const { nunjucksRender } = await import("../utils/nunjucksRender/index.js");
    const { setUpI18n } = await import("../utils/setUpI18n/index.js");

    await publicRoutes(mockApp);

    expect(mockRegister).toHaveBeenCalledTimes(3);
    expect(mockRegister).toHaveBeenNthCalledWith(1, fastifyCookie);
    expect(mockRegister).toHaveBeenNthCalledWith(2, nunjucksRender);
    expect(mockRegister).toHaveBeenNthCalledWith(3, setUpI18n);
  });

  it("sets up not found handler", async () => {
    await publicRoutes(mockApp);

    expect(mockSetNotFoundHandler).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
    );
  });

  it("sets up error handler", async () => {
    await publicRoutes(mockApp);

    expect(mockSetErrorHandler).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
    );
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
});
