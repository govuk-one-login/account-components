import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

// @ts-expect-error
vi.mock(import("../../../utils/paths.js"), () => ({
  paths: {
    journeys: {
      "account-delete": {
        EMAIL_NOT_VERIFIED: {
          resendEmailVerificationCode: {
            path: "/delete-account/resend-verification-code",
          },
        },
        EMAIL_VERIFIED: {
          TODO: { path: "/delete-account/TODO" },
        },
      },
    },
  },
}));

const mockVerifyOtpChallenge = vi.fn();
const mockRedirectToClientRedirectUri = vi.fn();

// @ts-expect-error
vi.mock(
  import("../../../../../commons/utils/accountManagementApiClient/index.js"),
  () => ({
    AccountManagementApiClient: vi.fn().mockImplementation(function () {
      return {
        verifyOtpChallenge: mockVerifyOtpChallenge,
      };
    }),
  }),
);

vi.mock(import("../../../utils/redirectToClientRedirectUri.js"), () => ({
  redirectToClientRedirectUri: mockRedirectToClientRedirectUri,
}));

const { verifyEmailAddressGetHandler, verifyEmailAddressPostHandler } =
  await import("./verifyEmailAddress.js");

describe("verifyEmailAddress handlers", () => {
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

  describe("verifyEmailAddressGetHandler", () => {
    it("should render verify email address template with resend code link and email address", async () => {
      const result = await verifyEmailAddressGetHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        {
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        },
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if reply.render is not available", async () => {
      delete mockReply.render;

      await expect(
        verifyEmailAddressGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw if session claims email is not available", async () => {
      // @ts-expect-error
      mockRequest.session = { claims: {} };

      await expect(
        verifyEmailAddressGetHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });
  });

  describe("verifyEmailAddressPostHandler", () => {
    it("should verify OTP challenge, send emailVerified event and redirect when valid code provided", async () => {
      mockRequest.body = { code: "123456" };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
      mockVerifyOtpChallenge.mockResolvedValue({ success: true });

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockVerifyOtpChallenge).toHaveBeenCalledWith(
        "test@example.com",
        "123456",
      );
      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        mockReply.journeyStates?.["account-delete"]?.send,
      ).toHaveBeenCalledWith({
        type: "emailVerified",
      });
      expect(mockReply.redirect).toHaveBeenCalledWith("/delete-account/TODO");
      expect(result).toBe(mockReply);
    });

    it("should render error when no code provided", async () => {
      mockRequest.body = {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = {
        t: vi
          .fn()
          .mockReturnValue(
            'Invalid key: Expected "code" but received undefined',
          ),
      } as any;

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            code: expect.objectContaining({
              text: 'Invalid key: Expected "code" but received undefined',
              href: "#code",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: 'Invalid key: Expected "code" but received undefined',
              href: "#code",
            }),
          ]),
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when code is not 6 characters", async () => {
      mockRequest.body = { code: "123" };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = {
        t: vi.fn().mockReturnValue("Code must be 6 characters"),
      } as any;

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            code: expect.objectContaining({
              text: "Code must be 6 characters",
              href: "#code",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: "Code must be 6 characters",
              href: "#code",
            }),
          ]),
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when code contains non-digits", async () => {
      mockRequest.body = { code: "12345a" };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = {
        t: vi.fn().mockReturnValue("Code must contain only digits"),
      } as any;

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            code: expect.objectContaining({
              text: "Code must contain only digits",
              href: "#code",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: "Code must contain only digits",
              href: "#code",
            }),
          ]),
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when code is not a string", async () => {
      mockRequest.body = { code: 123456 };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = {
        t: vi
          .fn()
          .mockReturnValue("Invalid type: Expected string but received 123456"),
      } as any;

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            code: expect.objectContaining({
              text: "Invalid type: Expected string but received 123456",
              href: "#code",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: "Invalid type: Expected string but received 123456",
              href: "#code",
            }),
          ]),
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when code is empty string", async () => {
      mockRequest.body = { code: "" };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = {
        t: vi.fn().mockReturnValue("Code cannot be empty"),
      } as any;

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            code: expect.objectContaining({
              text: "Code cannot be empty",
              href: "#code",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: "Code cannot be empty",
              href: "#code",
            }),
          ]),
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should render error when request body is not an object", async () => {
      mockRequest.body = "invalid";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mockRequest.i18n = {
        t: vi
          .fn()
          .mockReturnValue(
            'Invalid type: Expected Object but received "invalid"',
          ),
      } as any;

      const result = await verifyEmailAddressPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/account-delete/templates/verifyEmailAddress.njk",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errors: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            "": expect.objectContaining({
              text: 'Invalid type: Expected Object but received "invalid"',
              href: "#",
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          errorList: expect.arrayContaining([
            expect.objectContaining({
              text: 'Invalid type: Expected Object but received "invalid"',
              href: "#",
            }),
          ]),
          resendCodeLinkUrl: "/delete-account/resend-verification-code",
          emailAddress: "test@example.com",
        }),
      );
      expect(result).toBe(mockReply);
    });

    it("should throw if journey states are not available", async () => {
      delete mockReply.journeyStates;

      await expect(
        verifyEmailAddressPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it("should throw if account-delete journey state is not available", async () => {
      mockReply.journeyStates = {};

      await expect(
        verifyEmailAddressPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        ),
        // eslint-disable-next-line vitest/require-to-throw-message
      ).rejects.toThrowError();
    });

    it.each([
      "RequestIsMissingParameters",
      "TooManyEmailCodesEntered",
      "InvalidOTPCode",
      "ErrorValidatingResponseBody",
      "ErrorParsingResponseBodyJson",
      "ErrorValidatingErrorResponseBody",
      "ErrorParsingErrorResponseBodyJson",
      "UnknownErrorResponse",
      "UnknownError",
    ] as const)(
      "should redirect to client redirect URI when verifyOtpChallenge fails with %s",
      async (errorType) => {
        mockRequest.body = { code: "123456" };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        mockRequest.i18n = { t: vi.fn().mockReturnValue("Mock error") } as any;
        mockVerifyOtpChallenge.mockResolvedValue({
          success: false,
          error: errorType,
        });
        mockRedirectToClientRedirectUri.mockResolvedValue(mockReply);

        const result = await verifyEmailAddressPostHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockVerifyOtpChallenge).toHaveBeenCalledWith(
          "test@example.com",
          "123456",
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
