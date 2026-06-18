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
        { action: "temp-account-delete-action" },
      ]);
    });

    it("should push the action to existing journeyActions", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action" },
      ] as FastifySessionObject["journeyActions"];

      await startJourneyAction<"passkeyCreate">(
        { action: "passkey-create" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "temp-account-delete-action" },
        { action: "passkey-create" },
      ]);
    });

    it("should not push a duplicate when the action is already in progress", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action" },
      ] as FastifySessionObject["journeyActions"];

      await startJourneyAction<"tempAccountDeleteAction">(
        { action: "temp-account-delete-action" },
        mockRequest as unknown as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "temp-account-delete-action" },
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

    it("should replace the action with a successful completed action and add a timestamp", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action" },
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
          timestamp: 1000,
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
        journeyActions: [{ action: "temp-account-delete-action" }],
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

    it("should replace the action with a failed completed action and add a timestamp", async () => {
      mockRequest.session.journeyActions = [
        { action: "temp-account-delete-action" },
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
          timestamp: 2000,
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
        journeyActions: [{ action: "temp-account-delete-action" }],
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
});
