import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { frontend } from "./frontend.js";
import type { FastifyTypeboxInstance } from "../app.js";
import type { FastifyReply, FastifyRequest } from "fastify";

vi.mock("@fastify/cookie");
vi.mock("@fastify/session");
vi.mock("@fastify/helmet");
vi.mock("@fastify/csrf-protection");
vi.mock("@fastify/formbody");
vi.mock("../utils/getEnvironment/index.js");
vi.mock("../utils/nunjucksRender/index.js");
vi.mock("../utils/setUpI18n/index.js");

describe("frontend", () => {
  let mockApp: FastifyTypeboxInstance;
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockSetNotFoundHandler: ReturnType<typeof vi.fn>;
  let mockSetErrorHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn();
    mockSetNotFoundHandler = vi.fn();
    mockSetErrorHandler = vi.fn();

    mockApp = {
      register: mockRegister,
      setNotFoundHandler: mockSetNotFoundHandler,
      setErrorHandler: mockSetErrorHandler,
    } as unknown as FastifyTypeboxInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers all required plugins", async () => {
    const { getEnvironment } = await import("../utils/getEnvironment/index.js");
    const { nunjucksRender } = await import("../utils/nunjucksRender/index.js");
    const { default: fastifyFormBody } = await import("@fastify/formbody");
    const { default: fastifyHelmet } = await import("@fastify/helmet");
    const { default: fastifyCookie } = await import("@fastify/cookie");
    const { default: fastifySession } = await import("@fastify/session");
    const { default: fastifyCsrfProtection } = await import(
      "@fastify/csrf-protection"
    );
    const { setUpI18n } = await import("../utils/setUpI18n/index.js");

    vi.mocked(getEnvironment).mockReturnValue("production");

    frontend(mockApp);

    expect(mockRegister).toHaveBeenCalledTimes(7);
    expect(mockRegister).toHaveBeenNthCalledWith(1, fastifyFormBody);
    expect(mockRegister).toHaveBeenNthCalledWith(2, fastifyHelmet);
    expect(mockRegister).toHaveBeenNthCalledWith(3, fastifyCookie);
    expect(mockRegister).toHaveBeenNthCalledWith(4, fastifySession, {
      secret: [
        "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
      ],
      cookie: {
        secure: true,
        sameSite: "lax",
      },
    });
    expect(mockRegister).toHaveBeenNthCalledWith(5, fastifyCsrfProtection, {
      sessionPlugin: "@fastify/session",
    });
    expect(mockRegister).toHaveBeenNthCalledWith(6, nunjucksRender);
    expect(mockRegister).toHaveBeenNthCalledWith(7, setUpI18n);
  });

  it("configures session with secure: false for local environment", async () => {
    const { getEnvironment } = await import("../utils/getEnvironment/index.js");
    vi.mocked(getEnvironment).mockReturnValue("local");

    frontend(mockApp);

    expect(mockRegister.mock.calls[3]![1]).toMatchObject({
      cookie: {
        secure: false,
      },
    });
  });

  it("sets up not found handler", () => {
    frontend(mockApp);

    expect(mockSetNotFoundHandler).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
    );
  });

  it("sets up error handler", () => {
    frontend(mockApp);

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

    vi.doMock("./handlers/frontend/onNotFound/index.js", () => ({
      onNotFound: mockOnNotFound,
    }));

    frontend(mockApp);

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

    vi.doMock("./handlers/frontend/onError/index.js", () => ({
      onError: mockOnError,
    }));

    frontend(mockApp);

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
