import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { onRequest } from "./onRequest.js";
import type { FastifySessionObject } from "@fastify/session";
import type {
  Claims,
  Scope,
} from "../../../../commons/utils/authorize/getClaimsSchema.js";

// @ts-expect-error
vi.mock(import("../../utils/paths.js"), () => ({
  paths: {
    others: {
      authorizeError: { path: "/authorize-error" },
    },
    journeys: {
      "test-scope": {
        "test-state": {
          page: { path: "/test-path" },
        },
      },
    },
  },
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: vi.fn(),
  },
}));

// @ts-expect-error
vi.mock(import("./index.js"), () => ({
  journeys: {
    "test-scope": vi.fn().mockResolvedValue({
      translations: {
        en: { key: "value" },
      },
      stateMachine: {
        resolveState: vi.fn().mockReturnValue({}),
      },
    }),
  },
}));

vi.mock(import("xstate"), () => ({
  createActor: vi.fn(),
}));

vi.mock(import("../../../../commons/utils/getClientRegistry/index.js"), () => ({
  getClientRegistry: vi.fn(),
}));

vi.mock(
  import(
    "../../../../commons/utils/authorize/getRedirectToClientRedirectUri.js"
  ),
  () => ({
    getRedirectToClientRedirectUri: vi
      .fn()
      .mockReturnValue("http://redirect-uri"),
  }),
);

// @ts-expect-error
vi.mock(
  import("../../../../commons/utils/authorize/authorizeErrors.js"),
  () => ({
    authorizeErrors: {
      failedToCreateStateMachineActor: "failed_to_create_state_machine_actor",
      failedToValidateJourneyUrl: "failed_to_validate_journey_url",
    },
  }),
);

import { metrics } from "../../../../commons/utils/metrics/index.js";
import { journeys } from "./index.js";
import type { Actor, AnyActorLogic, AnyMachineSnapshot } from "xstate";
import { createActor } from "xstate";
import { getClientRegistry } from "../../../../commons/utils/getClientRegistry/index.js";
import { getRedirectToClientRedirectUri } from "../../../../commons/utils/authorize/getRedirectToClientRedirectUri.js";
import type { ClientEntry } from "../../../../config/schema/types.js";

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

    mockSession = {
      regenerate: vi.fn().mockResolvedValue(undefined),
    } as unknown as FastifySessionObject;

    mockRequest = {
      session: mockSession,
      log: {
        warn: vi.fn(),
      } as unknown as FastifyRequest["log"],
      i18n: {
        addResourceBundle: vi.fn(),
      } as unknown as FastifyRequest["i18n"],
    };

    mockReply = {
      redirect: vi.fn().mockReturnThis(),
      journeyStates: {},
      globals: {
        currentUrl: {
          pathname: "/test-path",
        } as URL,
      },
    };

    vi.mocked(createActor).mockReturnValue(mockActor);
    vi.mocked(getClientRegistry).mockResolvedValue([
      { client_id: "test-client-id" } as ClientEntry,
    ]);
  });

  describe("when session has no claims", () => {
    it("should redirect to error page and log warning", async () => {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const result = await onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.warn).toHaveBeenCalledWith("NoClaimsInSession");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "NoClaimsInSession",
        "Count",
        1,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSession.regenerate).toHaveBeenCalledWith();
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
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
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const result = await onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        { client_id: "non-existent-client" },
        "ClientNotFound",
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "ClientNotFound",
        "Count",
        1,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSession.regenerate).toHaveBeenCalledWith();
      expect(mockReply.redirect).toHaveBeenCalledWith("/authorize-error");
      expect(result).toBe(mockReply);
    });
  });

  describe("when actor creation fails", () => {
    beforeEach(() => {
      mockSession.claims = {
        client_id: "test-client-id",
        scope: "test-scope",
        redirect_uri: "http://client-redirect",
        state: "test-state",
      } as unknown as Claims;

      vi.mocked(createActor).mockImplementation(() => {
        throw new Error("Actor creation failed");
      });
    });

    it("should redirect to client redirect URI with error", async () => {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const result = await onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        { error: expect.any(Error) },
        "FailedToCreateStateMachineActor",
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "FailedToCreateStateMachineActor",
        "Count",
        1,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSession.regenerate).toHaveBeenCalledWith();
      expect(getRedirectToClientRedirectUri).toHaveBeenCalledWith(
        "http://client-redirect",
        "failed_to_create_state_machine_actor",
        "test-state",
      );
      expect(mockReply.redirect).toHaveBeenCalledWith("http://redirect-uri");
      expect(result).toBe(mockReply);
    });
  });

  describe("when URL validation fails", () => {
    beforeEach(() => {
      mockSession.claims = {
        client_id: "test-client-id",
        scope: "test-scope",
        redirect_uri: "http://client-redirect",
        state: "test-state",
      } as unknown as Claims;

      mockReply.globals = {
        currentUrl: {
          pathname: "/wrong-path",
        } as URL,
      };
    });

    it("should redirect to correct path when URL doesn't match", async () => {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const result = await onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.redirect).toHaveBeenCalledWith("/test-path");
      expect(result).toBe(mockReply);
    });

    it("should handle missing currentUrl", async () => {
      // @ts-expect-error
      mockReply.globals.currentUrl = undefined;

      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const result = await onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.log?.warn).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        { error: expect.any(Error) },
        "FailedToValidateJourneyUrl",
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(metrics.addMetric).toHaveBeenCalledWith(
        "FailedToValidateJourneyUrl",
        "Count",
        1,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSession.regenerate).toHaveBeenCalledWith();
      expect(mockReply.redirect).toHaveBeenCalledWith("http://redirect-uri");
      expect(result).toBe(mockReply);
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

      expect(mockReply.client).toStrictEqual({ client_id: "test-client-id" });
      expect(journeys["test-scope" as Scope]).toHaveBeenCalledWith();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockRequest.i18n?.addResourceBundle).toHaveBeenCalledWith(
        "en",
        "journey",
        { key: "value" },
      );
      expect(createActor).toHaveBeenCalledWith(expect.any(Object), {});
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockActor.start).toHaveBeenCalledWith();
      expect(mockReply.journeyStates).toStrictEqual({
        "test-scope": mockActor,
      });
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
  });
});
