import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockAuthenticate = vi.fn();
const mockCompleteJourney = vi.fn();
const mockCompleteAllJourneyActionsUnsuccessfully = vi.fn();

// @ts-expect-error
vi.mock(import("../../../utils/accountManagementApiClient.js"), () => ({
  AccountManagementApiClient: vi.fn().mockImplementation(function () {
    return {
      authenticate: mockAuthenticate,
    };
  }),
}));

vi.mock(import("../../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

vi.mock(import("../../utils/journeyActions.js"), async (importOriginal) => ({
  ...(await importOriginal()),
  completeAllJourneyActionsUnsuccessfully:
    mockCompleteAllJourneyActionsUnsuccessfully,
}));

const { enterPasswordGetHandler, enterPasswordPostHandler } =
  await import("./enterPassword.js");

describe("enterPassword handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: {
        // @ts-expect-error
        claims: {
          account_management_api_access_token: "test-token",
          email: "test@example.com",
          redirect_uri: "https://example.com/callback",
          state: "test-state",
        },
      },
    };
    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
      redirect: vi.fn().mockReturnThis(),
      journeyStates: {
        "account-delete": {
          send: vi.fn(),
        },
      } as unknown as FastifyReply["journeyStates"],
    } as unknown as FastifyReply;
  });

  describe("enterPasswordGetHandler", () => {
    it("should render enter password template", async () => {
      const result = await enterPasswordGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/enterPassword.njk",
        undefined,
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        enterPasswordGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });
  });

  describe("enterPasswordPostHandler", () => {
    it("should authenticate user, send authenticated event and redirect when valid password provided", async () => {
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
      mockAuthenticate.mockResolvedValue({ success: true });

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockAuthenticate).toHaveBeenCalledWith(
        "test@example.com",
        "validPassword123",
      );
      expect(
        mockReply.journeyStates?.["account-delete"]?.send,
      ).toHaveBeenCalledWith({
        type: "authenticated",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith("/reset-delete/confirm");
      expect(result).toBe(mockReply);
    });

    it("should render error when no password provided", async () => {
      mockRequest.body = {};
      mockRequest.i18n = {
        t: vi
          .fn()
          .mockReturnValue(
            'Invalid key: Expected "password" but received undefined',
          ),
      } as any;

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/enterPassword.njk",
        expect.objectContaining({
          errors: expect.objectContaining({
            password: expect.objectContaining({
              text: 'Invalid key: Expected "password" but received undefined',
              href: "#password",
            }),
          }),
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: 'Invalid key: Expected "password" but received undefined',
              href: "#password",
            }),
          ]),
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when password is empty string", async () => {
      mockRequest.body = { password: "" };
      mockRequest.i18n = {
        t: vi.fn().mockImplementation((key: string) => {
          if (key === "journey:enterPassword.formErrors.empty") {
            return "Password cannot be empty";
          }
          return "Mock error";
        }),
      } as any;

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/enterPassword.njk",
        expect.objectContaining({
          errors: expect.objectContaining({
            password: expect.objectContaining({
              text: "Password cannot be empty",
              href: "#password",
            }),
          }),
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: "Password cannot be empty",
              href: "#password",
            }),
          ]),
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when password is incorrect", async () => {
      mockRequest.body = { password: "wrongPassword" }; // pragma: allowlist secret
      mockRequest.i18n = {
        t: vi.fn().mockImplementation((key: string) => {
          if (key === "journey:enterPassword.formErrors.incorrect") {
            return "Incorrect password";
          }
          return "Mock error";
        }),
      } as any;
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "InvalidLoginCredentials",
      });

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockAuthenticate).toHaveBeenCalledWith(
        "test@example.com",
        "wrongPassword",
      );
      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/enterPassword.njk",
        expect.objectContaining({
          errors: expect.objectContaining({
            password: expect.objectContaining({
              text: "Incorrect password",
              href: "#password",
            }),
          }),
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: "Incorrect password",
              href: "#password",
            }),
          ]),
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if journey states are not available", async () => {
      delete mockReply.journeyStates;

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });

    it("should throw if account-delete journey state is not available", async () => {
      mockReply.journeyStates = {};

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });

    it("should throw if session claims are not available", async () => {
      delete mockRequest.session;
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });

    it("should throw if access token is not available", async () => {
      // @ts-expect-error
      delete mockRequest.session.claims.account_management_api_access_token;
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow();
    });

    it("should send lockedOutPasswordEnteredTooManyTimes event and redirect when ExceededIncorrectPasswordSubmissionLimit", async () => {
      mockRequest.body = { password: "invalidPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "ExceededIncorrectPasswordSubmissionLimit",
      });

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(
        mockReply.journeyStates?.["account-delete"]?.send,
      ).toHaveBeenCalledWith({
        type: "lockedOutPasswordEnteredTooManyTimes",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/reset-delete/password-entered-exceeded",
      );
      expect(result).toBe(mockReply);
    });

    it("should throw error when AccountInterventionsUnexpectedError", async () => {
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "AccountInterventionsUnexpectedError",
      });

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
      ).rejects.toThrow("AccountInterventionsUnexpectedError");
    });

    it("should complete journey unsuccessfully when UserAccountSuspended", async () => {
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "UserAccountSuspended",
      });
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteAllJourneyActionsUnsuccessfully).toHaveBeenCalledWith(
        {
          code: 1004,
          description: "AccountHasInterventions",
          destroySession: false,
          extras: {
            accountInterventionsStatus: {
              state: {
                blocked: false,
                suspended: true,
              },
            },
          },
        },
        mockRequest,
        mockReply,
      );
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        false,
      );
      expect(result).toBe(mockReply);
    });

    it("should complete journey unsuccessfully when UserAccountBlocked", async () => {
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
      mockAuthenticate.mockResolvedValue({
        success: false,
        error: "UserAccountBlocked",
      });
      mockCompleteJourney.mockResolvedValue(mockReply);

      const result = await enterPasswordPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockCompleteAllJourneyActionsUnsuccessfully).toHaveBeenCalledWith(
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
        mockRequest,
        mockReply,
      );
      expect(mockCompleteJourney).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        false,
      );
      expect(result).toBe(mockReply);
    });
  });
});
