import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifySessionObject } from "@fastify/session";

const mockSendAuditEvent = vi.fn();
const mockGetCommonAuditEventProps = vi.fn();
const mockCreateEvent = vi.fn();

vi.mock(import("../../../../commons/utils/auditEvents/index.js"), () => ({
  sendAuditEvent: mockSendAuditEvent,
  getCommonAuditEventProps: mockGetCommonAuditEventProps,
}));

vi.mock(import("@govuk-one-login/event-catalogue-utils"), () => ({
  createEvent: mockCreateEvent,
}));

const {
  completeJourneyActionUnsuccessfully,
  completeJourneyActionSuccessfully,
  completeAllJourneyActionsUnsuccessfully,
  startJourneyAction,
} = await import("./journeyActions.js");

describe("journeyActions", () => {
  let mockRequest: {
    session: { journeyActions?: FastifySessionObject["journeyActions"] };
    awsLambda?: unknown;
  };
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      session: {},
    };
    mockReply = {};
  });

  describe("startAction", () => {
    it("should initialise journeyActions and push the action when journeyActions is undefined", async () => {
      await startJourneyAction<"tempAccountDeleteAction">(
        { action: "temp-account-delete-action" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "temp-account-delete-action", startedAt: expect.any(Number) },
      ]);
    });

    it("should push the action to existing journeyActions", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action", startedAt: 500 },
      ] as FastifySessionObject["journeyActions"];

      await startJourneyAction<"passkeyCreate">(
        { action: "passkey-create" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "temp-account-delete-action", startedAt: 500 },
        { action: "passkey-create", startedAt: expect.any(Number) },
      ]);
    });

    it("should not push a duplicate when the action is already in progress", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action", startedAt: 500 },
      ] as FastifySessionObject["journeyActions"];

      await startJourneyAction<"tempAccountDeleteAction">(
        { action: "temp-account-delete-action" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "temp-account-delete-action", startedAt: 500 },
      ]);
    });

    it("should send an audit event when awsLambda event is present", async () => {
      mockRequest.awsLambda = { event: { requestContext: {} } };
      mockRequest.session = {
        claims: {
          client_id: "client-123",
          scope: "account-delete",
          email: "test@example.com",
          public_sub: "public-sub-123",
        },
      } as unknown as typeof mockRequest.session;
      mockGetCommonAuditEventProps.mockReturnValue({
        user: { session_id: "session-123" },
      });
      mockCreateEvent.mockReturnValue({ event_name: "AMC_ACTION_STARTED" });
      mockSendAuditEvent.mockResolvedValue(undefined);

      await startJourneyAction<"tempAccountDeleteAction">(
        { action: "temp-account-delete-action" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_ACTION_STARTED",
        expect.objectContaining({
          event_name: "AMC_ACTION_STARTED",
          client_id: "client-123",
          extensions: expect.objectContaining({
            account_action: "temp-account-delete-action",
            amc_scope: "account-delete",
          }),
        }),
      );
      expect(mockSendAuditEvent).toHaveBeenCalledWith(expect.anything());
    });

    it("should not send an audit event when awsLambda event is not present", async () => {
      await startJourneyAction<"tempAccountDeleteAction">(
        { action: "temp-account-delete-action" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockSendAuditEvent).not.toHaveBeenCalled();
    });
  });

  describe("completeJourneyActionSuccessfully", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: 1000 });
    });

    it("should throw when there are no current journey actions", async () => {
      await expect(
        completeJourneyActionSuccessfully<"tempAccountDeleteAction">(
          {
            action: "temp-account-delete-action",
            details: {},
          },
          mockRequest as unknown as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow("There are no journey actions");
    });

    it("should throw when the action is not found in current journey actions", async () => {
      mockRequest.session.journeyActions = [
        { action: "passkey-create" },
      ] as FastifySessionObject["journeyActions"];

      await expect(
        completeJourneyActionSuccessfully<"tempAccountDeleteAction">(
          {
            action: "temp-account-delete-action",
            details: {},
          },
          mockRequest as unknown as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow(
        'In progress action of type "temp-account-delete-action" not found in journey actions',
      );
    });

    it("should complete the action successfully with startedAt preserved and completedAt set", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action", startedAt: 500 },
      ] as FastifySessionObject["journeyActions"];

      await completeJourneyActionSuccessfully<"tempAccountDeleteAction">(
        {
          action: "temp-account-delete-action",
          details: {},
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "temp-account-delete-action",
          success: true,
          details: {},
          startedAt: 500,
          completedAt: 1000,
        },
      ]);
    });

    it("should send an audit event when awsLambda event is present", async () => {
      mockRequest.awsLambda = { event: { requestContext: {} } };
      mockRequest.session = {
        claims: {
          client_id: "client-123",
          scope: "account-delete",
          email: "test@example.com",
          public_sub: "public-sub-123",
        },
        journeyActions: [
          { action: "temp-account-delete-action", startedAt: 500 },
        ],
      } as unknown as typeof mockRequest.session;
      mockGetCommonAuditEventProps.mockReturnValue({
        user: { session_id: "session-123" },
      });
      mockCreateEvent.mockReturnValue({ event_name: "AMC_ACTION_COMPLETED" });
      mockSendAuditEvent.mockResolvedValue(undefined);

      await completeJourneyActionSuccessfully<"tempAccountDeleteAction">(
        {
          action: "temp-account-delete-action",
          details: {},
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_ACTION_COMPLETED",
        expect.objectContaining({
          event_name: "AMC_ACTION_COMPLETED",
          extensions: expect.objectContaining({
            account_action: "temp-account-delete-action",
            account_action_overall_success: true,
          }),
        }),
      );
      expect(mockSendAuditEvent).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe("completeJourneyActionUnsuccessfully", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: 2000 });
    });

    it("should throw when there are no current journey actions", async () => {
      await expect(
        completeJourneyActionUnsuccessfully(
          {
            action: "temp-account-delete-action",
            error: {
              code: 1001,
              description: "UserSignedOut",
              destroySession: true,
            },
          },
          mockRequest as unknown as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow("There are no journey actions");
    });

    it("should throw when the action is not found in current journey actions", async () => {
      mockRequest.session.journeyActions = [
        { action: "passkey-create" },
      ] as FastifySessionObject["journeyActions"];

      await expect(
        completeJourneyActionUnsuccessfully(
          {
            action: "temp-account-delete-action",
            error: {
              code: 1001,
              description: "UserSignedOut",
              destroySession: true,
            },
          },
          mockRequest as unknown as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow(
        'In progress action of type "temp-account-delete-action" not found in journey actions',
      );
    });

    it("should complete the action unsuccessfully with startedAt preserved and completedAt set", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action", startedAt: 500 },
      ] as FastifySessionObject["journeyActions"];

      await completeJourneyActionUnsuccessfully(
        {
          action: "temp-account-delete-action",
          error: {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "temp-account-delete-action",
          success: false,
          error: {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
          startedAt: 500,
          completedAt: 2000,
        },
      ]);
    });

    it("should send an audit event with error description when awsLambda event is present", async () => {
      mockRequest.awsLambda = { event: { requestContext: {} } };
      mockRequest.session = {
        claims: {
          client_id: "client-123",
          scope: "account-delete",
          email: "test@example.com",
          public_sub: "public-sub-123",
        },
        journeyActions: [
          { action: "temp-account-delete-action", startedAt: 500 },
        ],
      } as unknown as typeof mockRequest.session;
      mockGetCommonAuditEventProps.mockReturnValue({
        user: { session_id: "session-123" },
      });
      mockCreateEvent.mockReturnValue({ event_name: "AMC_ACTION_COMPLETED" });
      mockSendAuditEvent.mockResolvedValue(undefined);

      await completeJourneyActionUnsuccessfully(
        {
          action: "temp-account-delete-action",
          error: {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_ACTION_COMPLETED",
        expect.objectContaining({
          event_name: "AMC_ACTION_COMPLETED",
          extensions: expect.objectContaining({
            account_action: "temp-account-delete-action",
            account_action_overall_success: false,
            account_action_error: "UserSignedOut",
          }),
        }),
      );
      expect(mockSendAuditEvent).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe("completeAllJourneyActionsUnsuccessfully", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: 3000 });
    });

    it("should throw when there are no journey actions", async () => {
      await expect(
        completeAllJourneyActionsUnsuccessfully(
          {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
          mockRequest as unknown as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow("There are no journey actions");
    });

    it("should throw when an in-progress action name is not a known journey action", async () => {
      mockRequest.session.journeyActions = [
        { action: "unknown-action" },
      ] as unknown as FastifySessionObject["journeyActions"];

      await expect(
        completeAllJourneyActionsUnsuccessfully(
          {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
          mockRequest as unknown as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow("Action not found");
    });

    it("should complete all in-progress actions unsuccessfully", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action", startedAt: 500 },
        { action: "passkey-create", startedAt: 600 },
      ] as FastifySessionObject["journeyActions"];

      await completeAllJourneyActionsUnsuccessfully(
        {
          code: 1002,
          description: "UserAbortedJourney",
          destroySession: false,
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "temp-account-delete-action",
          success: false,
          error: {
            code: 1002,
            description: "UserAbortedJourney",
            destroySession: false,
          },
          startedAt: 500,
          completedAt: 3000,
        },
        {
          action: "passkey-create",
          success: false,
          error: {
            code: 1002,
            description: "UserAbortedJourney",
            destroySession: false,
          },
          startedAt: 600,
          completedAt: 3000,
        },
      ]);
    });

    it("should skip already-completed actions", async () => {
      mockRequest.session.journeyActions = [
        {
          action: "temp-account-delete-action",
          success: true,
          details: {},
          startedAt: 500,
          completedAt: 1000,
        },
        { action: "passkey-create", startedAt: 600 },
      ] as FastifySessionObject["journeyActions"];

      await completeAllJourneyActionsUnsuccessfully(
        {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "temp-account-delete-action",
          success: true,
          details: {},
          startedAt: 500,
          completedAt: 1000,
        },
        {
          action: "passkey-create",
          success: false,
          error: {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
          startedAt: 600,
          completedAt: 3000,
        },
      ]);
    });

    it("should send audit events for each in-progress action", async () => {
      mockRequest.awsLambda = { event: { requestContext: {} } };
      mockRequest.session = {
        claims: {
          client_id: "client-123",
          scope: "account-delete",
          email: "test@example.com",
          public_sub: "public-sub-123",
        },
        journeyActions: [
          { action: "temp-account-delete-action", startedAt: 500 },
          { action: "passkey-create", startedAt: 600 },
        ],
      } as unknown as typeof mockRequest.session;
      mockGetCommonAuditEventProps.mockReturnValue({
        user: { session_id: "session-123" },
      });
      mockCreateEvent.mockReturnValue({ event_name: "AMC_ACTION_COMPLETED" });
      mockSendAuditEvent.mockResolvedValue(undefined);

      await completeAllJourneyActionsUnsuccessfully(
        {
          code: 1001,
          description: "UserSignedOut",
          destroySession: true,
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockSendAuditEvent).toHaveBeenCalledTimes(2);
    });

    it("should complete all in-progress actions unsuccessfully with complex error including extras", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action", startedAt: 500 },
        { action: "passkey-create", startedAt: 600 },
      ] as FastifySessionObject["journeyActions"];

      await completeAllJourneyActionsUnsuccessfully(
        {
          code: 1004,
          description: "AccountHasInterventions",
          destroySession: false,
          extras: {
            accountInterventionsStatus: {
              state: {
                blocked: true,
                suspended: false,
              },
            },
          },
        },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "temp-account-delete-action",
          success: false,
          error: {
            code: 1004,
            description: "AccountHasInterventions",
            destroySession: false,
            extras: {
              accountInterventionsStatus: {
                state: {
                  blocked: true,
                  suspended: false,
                },
              },
            },
          },
          startedAt: 500,
          completedAt: 3000,
        },
        {
          action: "passkey-create",
          success: false,
          error: {
            code: 1004,
            description: "AccountHasInterventions",
            destroySession: false,
            extras: {
              accountInterventionsStatus: {
                state: {
                  blocked: true,
                  suspended: false,
                },
              },
            },
          },
          startedAt: 600,
          completedAt: 3000,
        },
      ]);
    });
  });
});
