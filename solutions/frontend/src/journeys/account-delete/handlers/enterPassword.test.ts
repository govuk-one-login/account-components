import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const mockAuthenticate = vi.fn();
const mockRedirectToClientRedirectUri = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/accountManagementApiClient/index.js"),
  () => ({
    AccountManagementApiClient: vi.fn().mockImplementation(function () {
      return {
        authenticate: mockAuthenticate,
      };
    }),
  }),
);

vi.mock(import("../../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
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
          access_token: "test-token",
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
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("enterPasswordPostHandler", () => {
    it("should authenticate user, send authenticated event and redirect when valid password provided", async () => {
      mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // eslint-disable-next-line @typescript-eslint/unbound-method
        mockReply.journeyStates?.["account-delete"]?.send,
      ).toHaveBeenCalledWith({
        type: "authenticated",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "/delete-account/confirm",
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when no password provided", async () => {
      mockRequest.body = {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            password: expect.objectContaining({
              text: 'Invalid key: Expected "password" but received undefined',
              href: "#password",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            password: expect.objectContaining({
              text: "Password cannot be empty",
              href: "#password",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            password: expect.objectContaining({
              text: "Incorrect password",
              href: "#password",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw if account-delete journey state is not available", async () => {
      mockReply.journeyStates = {};

      await expect(
        enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it.each([
      "RequestIsMissingParameters",
      "AccountDoesNotExist",
      "UserAccountBlocked",
      "UserAccountSuspended",
      "AccountInterventionsUnexpectedError",
      "ExceededIncorrectPasswordSubmissionLimit",
      "ErrorValidatingResponseBody",
      "ErrorParsingResponseBodyJson",
      "ErrorValidatingErrorResponseBody",
      "ErrorParsingErrorResponseBodyJson",
      "UnknownErrorResponse",
      "UnknownError",
    ] as const)(
      "should redirect to client redirect URI when authenticate fails with %s",
      async (errorType) => {
        mockRequest.body = { password: "validPassword123" }; // pragma: allowlist secret
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
        mockAuthenticate.mockResolvedValue({
          success: false,
          error: errorType,
        });
        mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

        const result = await enterPasswordPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockAuthenticate).toHaveBeenCalledWith(
          "test@example.com",
          "validPassword123",
        );
        expect(mockRedirectToClientRedirectUri).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          "https://example.com/callback",
          { description: "E1000", type: "access_denied" },
          "test-state",
        );
        expect(result).toBe(mockReply);
      },
    );
  });
});
