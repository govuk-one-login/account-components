import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyRequest } from "fastify";
import type { FastifySessionObject } from "@fastify/session";
import {
  completeJourneyActionUnsuccessfully,
  completeJourneyActionSuccessfully,
  startJourneyAction,
} from "./journeyActions.js";

describe("journeyActions", () => {
  let mockRequest: {
    session: { journeyActions?: FastifySessionObject["journeyActions"] };
  };

  beforeEach(() => {
    mockRequest = {
      session: {},
    };
  });

  describe("startAction", () => {
    it("should initialise journeyActions and push the action when journeyActions is undefined", () => {
      startJourneyAction<"accountDelete">(
        { action: "account-delete" },
        mockRequest as unknown as FastifyRequest,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "account-delete" },
      ]);
    });

    it("should push the action to existing journeyActions", () => {
      mockRequest.session.journeyActions = [
        { action: "account-delete" },
      ] as FastifySessionObject["journeyActions"];

      startJourneyAction<"passkeyCreate">(
        { action: "passkey-create" },
        mockRequest as unknown as FastifyRequest,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "account-delete" },
        { action: "passkey-create" },
      ]);
    });

    it("should not push a duplicate when the action is already in progress", () => {
      mockRequest.session.journeyActions = [
        { action: "account-delete" },
      ] as FastifySessionObject["journeyActions"];

      startJourneyAction<"accountDelete">(
        { action: "account-delete" },
        mockRequest as unknown as FastifyRequest,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        { action: "account-delete" },
      ]);
    });
  });

  describe("completeJourneyActionSuccessfully", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: 1000 });
    });

    it("should throw when there are no current journey actions", () => {
      expect(() => {
        completeJourneyActionSuccessfully<"accountDelete">(
          {
            action: "account-delete",
            details: {},
          },
          mockRequest as unknown as FastifyRequest,
        );
      }).toThrow("There are no journey actions");
    });

    it("should throw when the action is not found in current journey actions", () => {
      mockRequest.session.journeyActions = [
        { action: "passkey-create" },
      ] as FastifySessionObject["journeyActions"];

      expect(() => {
        completeJourneyActionSuccessfully<"accountDelete">(
          {
            action: "account-delete",
            details: {},
          },
          mockRequest as unknown as FastifyRequest,
        );
      }).toThrow(
        'In progress action of type "account-delete" not found in journey actions',
      );
    });

    it("should replace the action with a successful completed action and add a timestamp", () => {
      mockRequest.session.journeyActions = [
        { action: "account-delete" },
      ] as FastifySessionObject["journeyActions"];

      completeJourneyActionSuccessfully<"accountDelete">(
        {
          action: "account-delete",
          details: {},
        },
        mockRequest as unknown as FastifyRequest,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "account-delete",
          success: true,
          details: {},
          timestamp: 1000,
        },
      ]);
    });
  });

  describe("completeJourneyActionUnsuccessfully", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: 2000 });
    });

    it("should throw when there are no current journey actions", () => {
      expect(() => {
        completeJourneyActionUnsuccessfully(
          {
            action: "account-delete",
            error: {
              code: 1001,
              description: "UserSignedOut",
              destroySession: true,
            },
          },
          mockRequest as unknown as FastifyRequest,
        );
      }).toThrow("There are no journey actions");
    });

    it("should throw when the action is not found in current journey actions", () => {
      mockRequest.session.journeyActions = [
        { action: "passkey-create" },
      ] as FastifySessionObject["journeyActions"];

      expect(() => {
        completeJourneyActionUnsuccessfully(
          {
            action: "account-delete",
            error: {
              code: 1001,
              description: "UserSignedOut",
              destroySession: true,
            },
          },
          mockRequest as unknown as FastifyRequest,
        );
      }).toThrow(
        'In progress action of type "account-delete" not found in journey actions',
      );
    });

    it("should replace the action with a failed completed action and add a timestamp", () => {
      mockRequest.session.journeyActions = [
        { action: "account-delete" },
      ] as FastifySessionObject["journeyActions"];

      completeJourneyActionUnsuccessfully(
        {
          action: "account-delete",
          error: {
            code: 1001,
            description: "UserSignedOut",
            destroySession: true,
          },
        },
        mockRequest as unknown as FastifyRequest,
      );

      expect(mockRequest.session.journeyActions).toStrictEqual([
        {
          action: "account-delete",
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
  });
});
