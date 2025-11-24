import type { Mock } from "vitest";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { journeyRoutes } from "./index.js";
import { accountDelete } from "./account-delete/index.js";
import type { FastifyInstance } from "fastify";
import { testingJourney } from "./testing-journey/index.js";
import { onRequest } from "./utils/onRequest.js";
import { onSend } from "./utils/onSend.js";

vi.mock(import("./utils/onRequest.js"), () => ({
  onRequest: vi.fn(),
}));
vi.mock(import("./utils/onSend.js"), () => ({
  onSend: vi.fn(),
}));

describe("journeyRoutes plugin", () => {
  let mockFastify: FastifyInstance;
  let mockAddHook: Mock;
  let mockRegister: Mock;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddHook = vi.fn();
    mockRegister = vi.fn();
    mockRequest = {};
    mockReply = {};

    mockFastify = {
      addHook: mockAddHook,
      register: mockRegister,
    } as unknown as FastifyInstance;
  });

  it("adds onRequest hook", () => {
    journeyRoutes(mockFastify);

    expect(mockAddHook).toHaveBeenCalledWith("onRequest", expect.any(Function));
  });

  it("adds onSend hook", () => {
    journeyRoutes(mockFastify);

    expect(mockAddHook).toHaveBeenCalledWith("onSend", expect.any(Function));
  });

  it("calls onRequest function when onRequest hook is triggered", async () => {
    journeyRoutes(mockFastify);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const onRequestHook = mockAddHook.mock.calls.find(
      (call) => call[0] === "onRequest",
    )?.[1];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await onRequestHook(mockRequest, mockReply);

    expect(onRequest).toHaveBeenCalledWith(mockRequest, mockReply);
  });

  it("calls onSend function when onSend hook is triggered", async () => {
    journeyRoutes(mockFastify);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const onSendHook = mockAddHook.mock.calls.find(
      (call) => call[0] === "onSend",
    )?.[1];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await onSendHook(mockRequest, mockReply);

    expect(onSend).toHaveBeenCalledWith(mockRequest, mockReply);
  });

  it("registers testingJourney", () => {
    journeyRoutes(mockFastify);

    expect(mockRegister).toHaveBeenCalledWith(testingJourney);
  });

  it("registers accountDelete", () => {
    journeyRoutes(mockFastify);

    expect(mockRegister).toHaveBeenCalledWith(accountDelete);
  });
});
