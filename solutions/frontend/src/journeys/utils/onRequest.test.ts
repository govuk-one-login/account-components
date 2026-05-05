import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { onRequest } from "./onRequest.js";
import type { FastifySessionObject } from "@fastify/session";
import type { Claims } from "../../utils/getClaimsSchema.js";
import { metrics } from "../../../../commons/utils/metrics/index.js";
import { journeys } from "./config.js";
import type { Actor, AnyActorLogic, AnyMachineSnapshot } from "xstate";
import { createActor } from "xstate";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import type { ClientEntry } from "../../../../config/schema/types.js";
import { logger } from "../../../../commons/utils/logger/index.js";
import type { Scope } from "../../../../commons/utils/commonTypes.js";

const mockCompleteJourney = vi.hoisted(() => vi.fn());

// @ts-expect-error
vi.mock(import("../../utils/paths.js"), () => ({
  paths: {
    journeys: {
      others: {
        completeFailedJourney: {
          path: "/complete-failed-journey",
          analytics: {
            taxonomyLevel1: "others",
            taxonomyLevel2: "callback",
            contentId: "callback-page",
          },
        },
      },
      "test-scope": {
        "test-state": {
          page: {
            path: "/test-path",
            analytics: {
              taxonomyLevel1: "test",
              taxonomyLevel2: "scope",
              contentId: "test-page",
            },
          },
        },
      },
    },
    others: {
      authorizeError: { path: "/authorize-error" },
    },
  },
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: vi.fn(),
    addDimensions: vi.fn(),
    addMetadata: vi.fn(),
  },
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: { appendKeys: vi.fn() },
  loggerAPIGatewayProxyHandlerWrapper: vi.fn(),
}));

// @ts-expect-error
vi.mock(import("./config.js"), () => ({
  journeys: {
    "test-scope": vi.fn().mockResolvedValue({
      translations: {
        en: { key: "value" },
      },
      stateMachine: {
        resolveState: vi.fn().mockReturnValue({}),
      },
      requiredClaims: [],
    }),
  },
}));

vi.mock(import("xstate"), () => ({
  createActor: vi.fn(),
}));

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: vi.fn(),
}));

// @ts-expect-error
vi.mock(import("../../utils/authorizeErrors.js"), () => ({
  authorizeErrors: {
    userAborted: {
      description: "E1001",
      type: "access_denied",
    },
    failedToCreateStateMachineActor: {
      description: "E5009",
      type: "server_error",
    },
    failedToValidateJourneyUrl: {
      description: "E5010",
      type: "server_error",
    },
  },
}));

vi.mock(import("./completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

describe("onRequest", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockSession: FastifySessionObject;
  let mockActor: Actor<AnyActorLogic>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockActor = {
      start: vi.fn(),
      getSnapshot: vi.fn().mockReturnValue({
        value: "test-state",
      }),
    } as unknown as Actor<AnyActorLogic>;

    mockSession = {} as unknown as FastifySessionObject;

    mockRequest = {
      session: mockSession,
      log: {
        warn: vi.fn(),
      } as unknown as FastifyRequest["log"],
      i18n: {
        addResourceBundle: vi.fn(),
      } as unknown as FastifyRequest["i18n"],
      url: "http://localhost/test-path?param=value",
    };

    mockReply = {
      redirect: vi.fn().mockReturnThis(),
      journeyStates: {},
      client: undefined,
      globals: {
        currentUrl: {
          pathname: "/test-path",
        } as URL,
        buildCompleteFailedJourneyUri: undefined,
      },
    } as unknown as FastifyReply;

    vi.mocked(createActor).mockReturnValue(mockActor);
    vi.mocked(getClientRegistry).mockResolvedValue([
      { client_id: "test-client-id" } as ClientEntry,
    ]);
    vi.mocked(journeys["test-scope" as Scope]).mockResolvedValue({
      translations: { en: { key: "value" } } as any,
      stateMachine: { resolveState: vi.fn().mockReturnValue({}) } as any,
      requiredClaims: [],
    });
  });

  describe("when session has completedJourneyOutcomeId", () => {
    it("should call completeJourney with existing outcome id", async () => {
      mockSession.completedJourneyOutcomeId = "existing-outcome-id";

      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        "existing-outcome-id",
      );
    });
  });

  describe("when session has no claims", () => {
    it("should redirect to error page and log warning", async () => {
      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith("NoClaimsInSession");
      expect(metrics.addMetadata).toHaveBeenCalledWith(
        "error_type",
        "NoClaimsInSession",
      );
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "JourneyRequestError",
        "Count",
        1,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
    });
  });

  describe("when client is not found", () => {
    beforeEach(() => {
      mockSession.claims = {
        client_id: "non-existent-client",
        scope: "test-scope",
      } as unknown as Claims;
    });

    it("should redirect to error page and log warning", async () => {
      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        { client_id: "non-existent-client" },
        "ClientNotFound",
      );
      expect(metrics.addMetadata).toHaveBeenCalledWith(
        "error_type",
        "ClientNotFound",
      );
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "JourneyRequestError",
        "Count",
        1,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
    });
  });

  describe("when required claims are missing", () => {
    beforeEach(() => {
      mockSession.claims = {
        client_id: "test-client-id",
        scope: "test-scope",
      } as unknown as Claims;
      vi.mocked(journeys["test-scope" as Scope]).mockResolvedValue({
        translations: { en: { key: "value" } } as any,
        stateMachine: { resolveState: vi.fn().mockReturnValue({}) } as any,
        requiredClaims: ["account_management_api_access_token"] as any,
      });
    });

    it("should redirect to error page and log warning", async () => {
      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        { missingRequiredClaims: ["account_management_api_access_token"] },
        "RequiredClaimsMissing",
      );
      expect(metrics.addMetadata).toHaveBeenCalledWith(
        "error_type",
        "RequiredClaimsMissing",
      );
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "JourneyRequestError",
        "Count",
        1,
      );
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
    });
  });

  describe("successful flow", () => {
    beforeEach(() => {
      mockSession.claims = {
        client_id: "test-client-id",
        scope: "test-scope",
      } as unknown as Claims;
    });

    it("should set up journey state and add translations", async () => {
      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(metrics.addDimensions).toHaveBeenCalledWith({
        client_id: "test-client-id",
        scope: "test-scope",
        path: "/test-path",
      });
      expect(logger.appendKeys).toHaveBeenCalledWith({
        client_id: "test-client-id",
        scope: "test-scope",
      });
      expect(mockReply.client).toStrictEqual({ client_id: "test-client-id" });
      expect(mockReply.globals?.buildCompleteFailedJourneyUri).toBeTypeOf(
        "function",
      );
      expect(journeys["test-scope" as Scope]).toHaveBeenCalledWith();
      expect(mockRequest.i18n?.addResourceBundle).toHaveBeenCalledWith(
        "en",
        "journey",
        { key: "value" },
      );
      expect(createActor).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockActor.start).toHaveBeenCalledWith();
      expect(mockReply.journeyStates).toStrictEqual({
        "test-scope": mockActor,
      });
    });

    it("should set analytics from path configuration for journey paths", async () => {
      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.analytics).toStrictEqual({
        taxonomyLevel1: "test",
        taxonomyLevel2: "scope",
        contentId: "test-page",
      });
    });

    it("should not set analytics when path has no analytics configuration", async () => {
      // Test with a path that has no analytics in the mock
      mockReply.globals = {
        currentUrl: {
          pathname: "/authorize-error",
        } as URL,
      };

      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.analytics).toBeUndefined();
    });

    it("should set buildCompleteFailedJourneyUri function on globals", async () => {
      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.globals?.buildCompleteFailedJourneyUri).toBeTypeOf(
        "function",
      );

      const testError = {
        description: "UserSignedOut",
        code: 1001,
      } as const;
      const url = mockReply.globals?.buildCompleteFailedJourneyUri?.(testError);

      expect(url).toBe(
        "/complete-failed-journey?error_code=1001&error_description=UserSignedOut",
      );
    });

    it("should handle existing serialized snapshot", async () => {
      const mockSnapshot = { state: "existing-state" };
      mockSession.journeyStateSnapshot =
        mockSnapshot as unknown as AnyMachineSnapshot;

      await onRequest(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(createActor).toHaveBeenCalledWith(expect.any(Object), {
        snapshot: {},
      });
    });

    it.each([
      { channel: "strategic_app", expected: true },
      { channel: "generic_app", expected: true },
      { channel: "web", expected: false },
      { channel: undefined, expected: false },
    ])(
      "should set isAppChannel to $expected when channel is $channel",
      async ({ channel, expected }) => {
        mockSession.claims = {
          client_id: "test-client-id",
          scope: "test-scope",
          channel,
        } as unknown as Claims;

        await onRequest(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.globals?.isAppChannel).toBe(expected);
      },
    );
  });
});
