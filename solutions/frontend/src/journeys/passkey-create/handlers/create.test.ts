import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Claims } from "../../../utils/getClaimsSchema.js";
import type { FastifySessionObject } from "@fastify/session";

const ORIGINAL_ENV = { ...process.env };

const mockGenerateRegistrationOptions = vi.fn();
const mockVerifyRegistrationResponse = vi.fn();
const mockCompleteJourney = vi.fn();
const mockGetPasskeys = vi.fn();
const mockCreatePasskey = vi.fn();
const mockDecodeAttestationObject = vi.fn();
const mockAddMetric = vi.fn();
const mockAddMetadata = vi.fn();
const mockAddDimensions = vi.fn();
const mockSendNotification = vi.fn();
const mockGetPasskeyConvenienceMetadataByAaguid = vi.fn();

vi.mock(import("@simplewebauthn/server"), () => ({
  generateRegistrationOptions: mockGenerateRegistrationOptions,
  verifyRegistrationResponse: mockVerifyRegistrationResponse,
}));

// @ts-expect-error
vi.mock(import("@simplewebauthn/server/helpers"), () => ({
  isoUint8Array: {
    fromUTF8String: vi.fn((str: string) => str),
  },
  decodeAttestationObject: mockDecodeAttestationObject,
}));

vi.mock(import("../../utils/completeJourney.js"), () => ({
  completeJourney: mockCompleteJourney,
}));

// @ts-expect-error
vi.mock(import("../../../utils/accountDataApiClient.js"), () => ({
  AccountDataApiClient: class {
    getPasskeys = mockGetPasskeys;
    createPasskey = mockCreatePasskey;
  },
}));

// @ts-expect-error
vi.mock(import("../../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {
    addMetric: mockAddMetric,
    addMetadata: mockAddMetadata,
    addDimensions: mockAddDimensions,
  },
}));

vi.mock(
  import("../../../../../commons/utils/notifications/index.js"),
  async (importOriginal) => ({
    ...(await importOriginal()),
    sendNotification: mockSendNotification,
  }),
);

vi.mock(
  import("../../../../../commons/utils/passkeysConvenienceMetadata/index.js"),
  () => ({
    getPasskeyConvenienceMetadataByAaguid:
      mockGetPasskeyConvenienceMetadataByAaguid,
  }),
);

const { getHandler, postHandler } = await import("./create.js");

describe("passkey-create handlers", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockClaims: Claims;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env = {
      ...ORIGINAL_ENV,
      PASSKEYS_RP_ID: "example.com",
      PASSKEYS_RP_NAME: "Example Service",
      PASSKEYS_EXPECTED_ORIGIN: "https://example.com",
    };

    mockClaims = {
      email: "test@example.com",
      public_sub: "user-123",
      account_data_api_access_token: "access-token-123",
      sub: "internal-sub",
      client_id: "client-123",
      scope: "passkey-create",
      redirect_uri: "https://client.example.com/callback",
      state: "state-123",
    } as Claims;

    mockRequest = {
      session: {
        claims: mockClaims,
      } as FastifySessionObject,
      body: {},
      log: {
        warn: vi.fn(),
      } as unknown as FastifyRequest["log"],
      i18n: {
        t: vi.fn((key: string) => key),
      } as unknown as FastifyRequest["i18n"],
    };

    mockReply = {
      render: vi.fn().mockResolvedValue(undefined),
      redirect: vi.fn().mockReturnThis(),
      journeyStates: {
        "passkey-create": {
          send: vi.fn(),
          getSnapshot: vi.fn().mockReturnValue({
            context: {
              registrationOptions: {
                challenge: "test-challenge",
              },
            },
          }),
        },
      } as unknown as FastifyReply["journeyStates"],
      client: {
        consider_user_logged_in: false,
      } as unknown as FastifyReply["client"],
    } as unknown as FastifyReply;

    mockGetPasskeys.mockResolvedValue({
      success: true,
      result: { passkeys: [] },
    });

    mockGenerateRegistrationOptions.mockResolvedValue({
      challenge: "test-challenge",
      rp: { name: "Example Service", id: "example.com" },
      user: {
        id: "user-123",
        name: "test@example.com",
        displayName: "test@example.com",
      },
    });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("getHandler", () => {
    it("should render the create passkey page with showErrorUi false by default", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/passkey-create/templates/create.njk",
        expect.objectContaining({
          showErrorUi: false,
          stringsSuffix: "_signedOut",
          formAction: "/cannot-set-up-passkey",
        }),
      );
    });

    it("should render with showErrorUi true when passed", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        true,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/passkey-create/templates/create.njk",
        expect.objectContaining({
          showErrorUi: true,
          stringsSuffix: "_signedOut",
          formAction: "/cannot-set-up-passkey",
        }),
      );
    });

    it("should fetch existing passkeys and exclude them", async () => {
      mockGetPasskeys.mockResolvedValue({
        success: true,
        result: {
          passkeys: [{ id: "passkey-1" }, { id: "passkey-2" }],
        },
      });

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeCredentials: [{ id: "passkey-1" }, { id: "passkey-2" }],
        }),
      );
    });

    it("should use signed in strings when user is logged in", async () => {
      mockReply.client = {
        consider_user_logged_in: true,
      } as unknown as NonNullable<FastifyReply["client"]>;

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/passkey-create/templates/create.njk",
        expect.objectContaining({
          stringsSuffix: "_signedIn",
          formAction: "/cannot-set-up-passkey",
        }),
      );
    });

    it("should throw error when getPasskeys fails", async () => {
      mockGetPasskeys.mockResolvedValue({
        success: false,
        error: "API error",
      });

      await expect(
        getHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow("API error");
    });

    it("should throw when session claims are missing", async () => {
      mockRequest.session = {} as FastifySessionObject;

      await expect(
        getHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow();
    });

    it("should throw when PASSKEYS_RP_ID is not set", async () => {
      delete process.env["PASSKEYS_RP_ID"];

      await expect(
        getHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow();
    });
  });

  describe("postHandler", () => {
    describe("validation", () => {
      it("should show error when action is undefined", async () => {
        mockRequest.body = {
          registrationResponse: JSON.stringify({}),
        };

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.render).toHaveBeenCalledWith(
          "journeys/passkey-create/templates/create.njk",
          expect.objectContaining({
            showErrorUi: true,
            errors: expect.any(Object),
            errorList: expect.any(Array),
            formAction: "/cannot-set-up-passkey",
          }),
        );
      });

      it("should show error when body is invalid", async () => {
        mockRequest.body = { invalid: "data" };

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.render).toHaveBeenCalledWith(
          "journeys/passkey-create/templates/create.njk",
          expect.objectContaining({
            showErrorUi: true,
          }),
        );
        expect(mockRequest.log?.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            issues: expect.any(Object),
          }),
          "Register passkey - invalid request body",
        );
        expect(mockAddDimensions).toHaveBeenCalledWith({
          error_type: "InvalidRequestBody",
        });
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
      });
    });

    describe("skip action", () => {
      it("should complete journey with user aborted error when skip is selected", async () => {
        mockRequest.body = {
          action: "skip",
          registrationResponse: JSON.stringify({}),
        };
        mockCompleteJourney.mockResolvedValue(mockReply);

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockCompleteJourney).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          expect.objectContaining({
            error: {
              code: 1002,
              description: "UserAbortedJourney",
            },
          }),
          false,
        );
      });
    });

    describe("register action", () => {
      beforeEach(() => {
        mockRequest.body = {
          action: "register",
          registrationResponse: JSON.stringify({
            id: "credential-id",
            rawId: "credential-id",
            response: {
              clientDataJSON: "client-data",
              attestationObject: "attestation-object",
            },
            type: "public-key",
          }),
        };

        mockVerifyRegistrationResponse.mockResolvedValue({
          verified: true,
          registrationInfo: {
            credential: {
              id: "credential-id",
              publicKey: new Uint8Array([1, 2, 3]),
              counter: 0,
              transports: ["usb", "nfc"],
            },
            aaguid: "aaguid-123",
            credentialBackedUp: true,
            credentialDeviceType: "multiDevice",
            attestationObject: new Uint8Array([4, 5, 6]),
          },
        });

        mockDecodeAttestationObject.mockReturnValue(
          new Map([["attStmt", new Map([["sig", new Uint8Array([7, 8, 9])]])]]),
        );

        mockCreatePasskey.mockResolvedValue({
          success: true,
        });

        mockGetPasskeyConvenienceMetadataByAaguid.mockResolvedValue(undefined);
        mockSendNotification.mockResolvedValue(undefined);
        mockCompleteJourney.mockResolvedValue(mockReply);
      });

      it("should successfully register a passkey", async () => {
        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockVerifyRegistrationResponse).toHaveBeenCalledWith({
          response: expect.any(Object),
          expectedChallenge: "test-challenge",
          expectedOrigin: "https://example.com",
          expectedRPID: "example.com",
        });

        expect(mockCreatePasskey).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            id: "credential-id",
            aaguid: "aaguid-123",
            isAttested: true,
            signCount: 0,
            transports: ["usb", "nfc"],
            isBackedUp: true,
            isBackUpEligible: true,
          }),
        );

        expect(mockCompleteJourney).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { aaguid: "aaguid-123" },
          true,
        );
      });

      it("should handle passkey without attestation signature", async () => {
        mockDecodeAttestationObject.mockReturnValue(
          new Map([["attStmt", new Map()]]),
        );

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockCreatePasskey).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            isAttested: false,
          }),
        );
      });

      it("should handle single device credential", async () => {
        mockVerifyRegistrationResponse.mockResolvedValue({
          verified: true,
          registrationInfo: {
            credential: {
              id: "credential-id",
              publicKey: new Uint8Array([1, 2, 3]),
              counter: 0,
              transports: [],
            },
            aaguid: "aaguid-123",
            credentialBackedUp: false,
            credentialDeviceType: "singleDevice",
            attestationObject: new Uint8Array([4, 5, 6]),
          },
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockCreatePasskey).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            isBackUpEligible: false,
            transports: [],
          }),
        );
      });

      it("should show error when verification throws an error", async () => {
        mockVerifyRegistrationResponse.mockRejectedValue(
          new Error("Verification error"),
        );

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.render).toHaveBeenCalledWith(
          "journeys/passkey-create/templates/create.njk",
          expect.objectContaining({
            showErrorUi: true,
          }),
        );
        expect(mockRequest.log?.warn).toHaveBeenCalledWith(
          { error: new Error("Verification error") },
          "Register passkey - verification error",
        );
        expect(mockAddDimensions).toHaveBeenCalledWith({
          error_type: "VerificationError",
        });
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
      });

      it("should show error when verification fails", async () => {
        mockVerifyRegistrationResponse.mockResolvedValue({
          verified: false,
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.render).toHaveBeenCalledWith(
          "journeys/passkey-create/templates/create.njk",
          expect.objectContaining({
            showErrorUi: true,
          }),
        );
        expect(mockRequest.log?.warn).toHaveBeenCalledWith(
          "Register passkey - verification failed",
        );
        expect(mockAddDimensions).toHaveBeenCalledWith({
          error_type: "VerificationFailed",
        });
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
      });

      it("should send notification with passkey name when aaguid is found", async () => {
        mockGetPasskeyConvenienceMetadataByAaguid.mockResolvedValue({
          name: "iCloud Keychain",
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockGetPasskeyConvenienceMetadataByAaguid).toHaveBeenCalledWith(
          "aaguid-123",
        );
        expect(mockSendNotification).toHaveBeenCalledWith({
          notificationType: "CREATE_PASSKEY_WITH_PASSKEY_NAME",
          emailAddress: "test@example.com",
          passkeyName: "iCloud Keychain",
        });
      });

      it("should send notification without passkey name when aaguid is not found", async () => {
        mockGetPasskeyConvenienceMetadataByAaguid.mockResolvedValue(undefined);

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockGetPasskeyConvenienceMetadataByAaguid).toHaveBeenCalledWith(
          "aaguid-123",
        );
        expect(mockSendNotification).toHaveBeenCalledWith({
          notificationType: "CREATE_PASSKEY_WITHOUT_PASSKEY_NAME",
          emailAddress: "test@example.com",
        });
      });

      it("should throw error when createPasskey fails", async () => {
        mockCreatePasskey.mockResolvedValue({
          success: false,
          error: "Database error",
        });

        await expect(
          postHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
        ).rejects.toThrow("Database error");
      });

      it("should show error when registrationError is present", async () => {
        mockRequest.body = {
          action: "register",
          registrationError: "Client error occurred",
          registrationResponse: JSON.stringify({}),
        };

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.render).toHaveBeenCalledWith(
          "journeys/passkey-create/templates/create.njk",
          expect.objectContaining({
            showErrorUi: true,
          }),
        );
        expect(mockRequest.log?.warn).toHaveBeenCalledWith(
          { error: "Client error occurred" },
          "Register passkey - client error",
        );
        expect(mockAddMetadata).toHaveBeenCalledWith(
          "ClientErrorMessage",
          "Client error occurred",
        );
        expect(mockAddDimensions).toHaveBeenCalledWith({
          error_type: "ClientError",
        });
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
      });

      it("should throw when journey state is missing", async () => {
        delete mockReply.journeyStates;

        await expect(
          postHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
        ).rejects.toThrow();
      });

      it("should throw when registration options are missing", async () => {
        mockReply.journeyStates = {
          // @ts-expect-error
          "passkey-create": {
            send: vi.fn(),
            getSnapshot: vi.fn().mockReturnValue({
              context: {},
            }),
          },
        };

        await expect(
          postHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
        ).rejects.toThrow();
      });

      it("should throw when PASSKEYS_EXPECTED_ORIGIN is not set", async () => {
        delete process.env["PASSKEYS_EXPECTED_ORIGIN"];

        await expect(
          postHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
        ).rejects.toThrow();
      });
    });

    describe("maximum passkeys", () => {
      it("should re-render with error UI when the maximum number of passkeys is reached", async () => {
        mockRequest.body = {
          action: "register",
          registrationResponse: JSON.stringify({}),
        };

        mockGetPasskeys.mockResolvedValue({
          success: true,
          result: {
            passkeys: [
              { id: "passkey-1" },
              { id: "passkey-2" },
              { id: "passkey-3" },
              { id: "passkey-4" },
              { id: "passkey-5" },
            ],
          },
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockReply.render).toHaveBeenCalledWith(
          "journeys/passkey-create/templates/create.njk",
          expect.objectContaining({
            showErrorUi: true,
          }),
        );
        expect(mockRequest.log?.warn).toHaveBeenCalledWith(
          "Register passkey - user has maximum number of passkeys",
        );
        expect(mockAddMetric).toHaveBeenCalledWith(
          "UserHasMaximumNumberOfPasskeys",
          "Count",
          1,
        );
      });

      it("should prevent registration when the maximum number of passkeys is reached", async () => {
        mockRequest.body = {
          action: "register",
          registrationResponse: JSON.stringify({}),
        };

        mockGetPasskeys.mockResolvedValue({
          success: true,
          result: {
            passkeys: [
              { id: "passkey-1" },
              { id: "passkey-2" },
              { id: "passkey-3" },
              { id: "passkey-4" },
              { id: "passkey-5" },
            ],
          },
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockVerifyRegistrationResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            expectedChallenge: "test-challenge",
            expectedOrigin: "https://example.com",
            expectedRPID: "example.com",
          }),
        );
        expect(mockCreatePasskey).not.toHaveBeenCalled();
      });

      it("should allow registration when the maximum number of passkeys is not reached", async () => {
        mockRequest.body = {
          action: "register",
          registrationResponse: JSON.stringify({
            id: "credential-id",
            rawId: "credential-id",
            response: {
              clientDataJSON: "client-data",
              attestationObject: "attestation-object",
            },
            type: "public-key",
          }),
        };

        mockGetPasskeys.mockResolvedValue({
          success: true,
          result: {
            passkeys: [{ id: "passkey-1" }],
          },
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockVerifyRegistrationResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            expectedChallenge: "test-challenge",
            expectedOrigin: "https://example.com",
            expectedRPID: "example.com",
          }),
        );
        expect(mockCreatePasskey).toHaveBeenCalledWith(
          "user-123",
          expect.any(Object),
        );
      });
    });
  });
});
