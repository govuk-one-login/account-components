import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import {
  externalEndpointStubs,
  ConfigureExternalEndpointsGetSchema,
  ConfigureExternalEndpointsPostSchema,
} from "./index.js";
import type { FastifyTypeboxInstance } from "../../app.js";
import type { FastifyReply, FastifyRequest } from "fastify";

vi.mock("@fastify/formbody");
vi.mock("./handlers/utils/config/index.js");
vi.mock("./handlers/utils/paths/index.js");

describe("externalEndpointStubs", () => {
  let mockApp: FastifyTypeboxInstance;
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn();
    mockGet = vi.fn();
    mockPost = vi.fn();

    mockApp = {
      register: mockRegister,
      get: mockGet,
      post: mockPost,
    } as unknown as FastifyTypeboxInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers required plugins", async () => {
    const { default: fastifyFormBody } = await import("@fastify/formbody");

    externalEndpointStubs(mockApp);

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenNthCalledWith(1, fastifyFormBody);
  });

  it("registers configure GET route", async () => {
    const { getPath } = await import("./handlers/utils/paths/index.js");
    vi.mocked(getPath).mockReturnValue("/configure");

    externalEndpointStubs(mockApp);

    expect(mockGet).toHaveBeenCalledWith(
      "/configure",
      { schema: ConfigureExternalEndpointsGetSchema },
      expect.any(Function),
    );
  });

  it("registers configure POST route", async () => {
    const { getPath } = await import("./handlers/utils/paths/index.js");
    vi.mocked(getPath).mockReturnValue("/configure");

    externalEndpointStubs(mockApp);

    expect(mockPost).toHaveBeenCalledWith(
      "/configure",
      { schema: ConfigureExternalEndpointsPostSchema },
      expect.any(Function),
    );
  });

  it("get handler dynamically imports and calls getHandler", async () => {
    const mockGetHandler = vi.fn();
    const mockRequest = {} as FastifyRequest;
    const mockReply = {} as FastifyReply;

    vi.doMock("./handlers/configure/index.js", () => ({
      getHandler: mockGetHandler,
    }));

    externalEndpointStubs(mockApp);

    const getHandler = mockGet.mock.calls[0]![2] as (...args: any) => any;
    await getHandler(mockRequest, mockReply);

    expect(mockGetHandler).toHaveBeenCalledWith(mockRequest, mockReply);
  });

  it("post handler dynamically imports and calls postHandler", async () => {
    const mockPostHandler = vi.fn();
    const mockRequest = {} as FastifyRequest;
    const mockReply = {} as FastifyReply;

    vi.doMock("./handlers/configure/index.js", () => ({
      postHandler: mockPostHandler,
    }));

    externalEndpointStubs(mockApp);

    const postHandler = mockPost.mock.calls[0]![2] as (...args: any) => any;
    await postHandler(mockRequest, mockReply);

    expect(mockPostHandler).toHaveBeenCalledWith(mockRequest, mockReply);
  });
});
