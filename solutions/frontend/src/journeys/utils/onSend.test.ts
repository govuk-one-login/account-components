import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { onSend } from "./onSend.js";
import type { FastifySessionObject } from "@fastify/session";
import type { Claims } from "../../../../commons/utils/authorize/getClaimsSchema.js";

describe("onSend", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockSession: FastifySessionObject;
  let mockJourneyState: {
    getSnapshot: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockJourneyState = {
      getSnapshot: vi.fn().mockReturnValue({ state: "test-state" }),
    };

    mockSession = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as FastifySessionObject;

    mockRequest = {
      session: mockSession,
    };

    mockReply = {
      headers: vi.fn().mockReturnThis(),
      journeyStates: {},
    };
  });

  it("should set cache-control header to no-store", async () => {
    await onSend(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.headers).toHaveBeenCalledWith({
      "cache-control": "no-store",
    });
  });

  it("should not process journey state when session has no claims", async () => {
    await onSend(mockRequest as FastifyRequest, mockReply as FastifyReply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("should not process journey state when journeyStates is undefined", async () => {
    mockSession.claims = { scope: "testing-journey" } as Claims;
    // @ts-expect-error
    mockReply.journeyStates = undefined;

    await onSend(mockRequest as FastifyRequest, mockReply as FastifyReply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("should not process journey state when scope not found in journeyStates", async () => {
    mockSession.claims = { scope: "non-existent-scope" } as unknown as Claims;
    mockReply.journeyStates = {
      ["other-scope" as Claims["scope"]]: mockJourneyState,
    };

    await onSend(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockJourneyState.getSnapshot).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("should save journey state snapshot when all conditions are met", async () => {
    const testScope = "test-scope";
    const mockSnapshot = { state: "test-state", data: "test-data" };

    mockSession.claims = { scope: testScope } as unknown as Claims;
    mockReply.journeyStates = {
      [testScope as Claims["scope"]]: mockJourneyState,
    };
    mockJourneyState.getSnapshot.mockReturnValue(mockSnapshot);

    await onSend(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockJourneyState.getSnapshot).toHaveBeenCalledWith();
    expect(mockSession.journeyStateSnapshot).toBe(mockSnapshot);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockSession.save).toHaveBeenCalledWith();
  });
});
