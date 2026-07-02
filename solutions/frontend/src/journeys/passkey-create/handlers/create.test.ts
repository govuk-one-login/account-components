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
const mockStartJourneyAction = vi.fn();
const mockCompleteJourneyActionSuccessfully = vi.fn();
const mockCompleteJourneyActionUnsuccessfully = vi.fn();
const mockCompleteAllJourneyActionsUnsuccessfully = vi.fn();
const mockSendPasskeyRegistrationGeneratedAuditEvent = vi.fn();
const mockSendPasskeyRegistrationFailedAuditEvent = vi.fn();
const mockSendPasskeyRegistrationSuccessfulAuditEvent = vi.fn();
const mockSendPasskeyEnrolmentFailedAuditEvent = vi.fn();
const mockSendPasskeyEnrolmentSuccessfulAuditEvent = vi.fn();
const mockExtractRegistrationResponseInfo = vi.fn();
const mockGetUserAisStatus = vi.fn();

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

vi.mock(import("../../utils/journeyActions.js"), async (importOriginal) => ({
  ...(await importOriginal()),
  startJourneyAction: mockStartJourneyAction,
  completeJourneyActionSuccessfully: mockCompleteJourneyActionSuccessfully,
  completeJourneyActionUnsuccessfully: mockCompleteJourneyActionUnsuccessfully,
  completeAllJourneyActionsUnsuccessfully:
    mockCompleteAllJourneyActionsUnsuccessfully,
}));

vi.mock(import("../utils/auditEvents/index.js"), async (importOriginal) => ({
  ...(await importOriginal()),
  sendPasskeyRegistrationGeneratedAuditEvent:
    mockSendPasskeyRegistrationGeneratedAuditEvent,
  sendPasskeyRegistrationFailedAuditEvent:
    mockSendPasskeyRegistrationFailedAuditEvent,
  sendPasskeyRegistrationSuccessfulAuditEvent:
    mockSendPasskeyRegistrationSuccessfulAuditEvent,
  sendPasskeyEnrolmentFailedAuditEvent:
    mockSendPasskeyEnrolmentFailedAuditEvent,
  sendPasskeyEnrolmentSuccessfulAuditEvent:
    mockSendPasskeyEnrolmentSuccessfulAuditEvent,
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

vi.mock(import("../utils/extractRegistrationResponseInfo/index.js"), () => ({
  extractRegistrationResponseInfo: mockExtractRegistrationResponseInfo,
}));

// @ts-expect-error
vi.mock(
  import("../../../utils/accountInterventionsServiceApiClient.js"),
  () => ({
    AccountInterventionsServiceApiClient: class {
      getUserAisStatus = mockGetUserAisStatus;
    },
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
        info: vi.fn(),
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

    mockGetUserAisStatus.mockResolvedValue({
      success: true,
      result: {
        state: {
          blocked: false,
          suspended: false,
          reproveIdentity: false,
          resetPassword: false,
        },
      },
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

      expect(mockStartJourneyAction).toHaveBeenCalledWith(
        { action: "passkey-create" },
        mockRequest,
        mockReply,
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

    it("should send passkey registration generated audit event with the registration options", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(
        mockSendPasskeyRegistrationGeneratedAuditEvent,
      ).toHaveBeenCalledWith(mockRequest, mockReply, {
        challenge: "test-challenge",
        rp: { name: "Example Service", id: "example.com" },
        user: {
          id: "user-123",
          name: "test@example.com",
          displayName: "test@example.com",
        },
      });
    });

    it("should send passkey registration generated audit event on every render including error renders", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        true,
      );

      expect(
        mockSendPasskeyRegistrationGeneratedAuditEvent,
      ).toHaveBeenCalledWith(mockRequest, mockReply, {
        challenge: "test-challenge",
        rp: { name: "Example Service", id: "example.com" },
        user: {
          id: "user-123",
          name: "test@example.com",
          displayName: "test@example.com",
        },
      });
    });

    it("should render with showErrorUi true when passed", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        true,
      );

      expect(mockStartJourneyAction).not.toHaveBeenCalled();
      expect(mockReply.render).toHaveBeenCalledWith(
        "journeys/passkey-create/templates/create.njk",
        expect.objectContaining({
          showErrorUi: true,
          stringsSuffix: "_signedOut",
          formAction: "/cannot-set-up-passkey",
        }),
      );
    });

    it("should show the correct content id based on whether the user is logged in or not", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.analytics).toStrictEqual(
        expect.objectContaining({
          contentId: "5693e0d5-281e-4ab8-b458-422585f20dfc",
        }),
      );

      mockReply.client = {
        consider_user_logged_in: true,
      } as unknown as NonNullable<FastifyReply["client"]>;

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockReply.analytics).toStrictEqual(
        expect.objectContaining({
          contentId: "980afc26-cd94-452a-9624-29ede30e1bf3",
        }),
      );
    });

    it("should show the correct content id when showErrorUi is true", async () => {
      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        true,
      );

      expect(mockReply.analytics).toStrictEqual(
        expect.objectContaining({
          contentId: "c1d63d4a-1be0-4098-8feb-3aae27c67b85",
        }),
      );

      mockReply.client = {
        consider_user_logged_in: true,
      } as unknown as NonNullable<FastifyReply["client"]>;

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        true,
      );

      expect(mockReply.analytics).toStrictEqual(
        expect.objectContaining({
          contentId: "e71140bc-bd4d-4ea2-9716-5bbb36c696dd",
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
          supportedAlgorithmIDs: [-7, -8, -257],
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

    it("should send enrolment failed audit event when getPasskeys fails in postHandler", async () => {
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

      mockGetPasskeys.mockResolvedValue({
        success: false,
        error: "API error",
      });

      await expect(
        postHandler(mockRequest as FastifyRequest, mockReply as FastifyReply),
      ).rejects.toThrow("API error");

      expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
        mockRequest,
        mockReply,
        { challenge: "test-challenge" },
        {
          id: "credential-id",
          rawId: "credential-id",
          response: {
            clientDataJSON: "client-data",
            attestationObject: "attestation-object",
          },
          type: "public-key",
        },
        "ErrorGettingExistingPasskeysForUser",
      );
    });

    it("should complete journey unsuccessfully when user account is blocked", async () => {
      mockGetUserAisStatus.mockResolvedValue({
        success: true,
        result: {
          state: {
            blocked: true,
            suspended: false,
            reproveIdentity: false,
            resetPassword: false,
          },
        },
      });
      mockCompleteJourney.mockResolvedValue(mockReply);

      await getHandler(
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
                reproveIdentity: false,
                resetPassword: false,
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
    });

    it("should complete journey unsuccessfully when user account is suspended", async () => {
      mockGetUserAisStatus.mockResolvedValue({
        success: true,
        result: {
          state: {
            blocked: false,
            suspended: true,
            reproveIdentity: false,
            resetPassword: false,
          },
        },
      });
      mockCompleteJourney.mockResolvedValue(mockReply);

      await getHandler(
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
                reproveIdentity: false,
                resetPassword: false,
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
    });

    it("should proceed normally when AIS status has no interventions", async () => {
      mockGetUserAisStatus.mockResolvedValue({
        success: true,
        result: {
          state: {
            blocked: false,
            suspended: false,
            reproveIdentity: false,
            resetPassword: false,
          },
        },
      });

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(
        mockCompleteAllJourneyActionsUnsuccessfully,
      ).not.toHaveBeenCalled();
      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockReply.render).toHaveBeenCalled();
    });

    it("should proceed normally when AIS status check fails", async () => {
      mockGetUserAisStatus.mockResolvedValue({
        success: false,
        error: "SomeError",
      });

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(
        mockCompleteAllJourneyActionsUnsuccessfully,
      ).not.toHaveBeenCalled();
      // eslint-disable-next-line vitest/prefer-called-with
      expect(mockReply.render).toHaveBeenCalled();
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
        expect(mockAddMetadata).toHaveBeenCalledWith(
          "error_type",
          "InvalidRequestBody",
        );
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
        expect(mockReply.analytics).toStrictEqual(
          expect.objectContaining({
            reason: "InvalidRequestBody",
          }),
        );
        expect(
          mockSendPasskeyRegistrationFailedAuditEvent,
        ).toHaveBeenCalledWith(mockRequest, mockReply);
        expect(
          mockSendPasskeyRegistrationFailedAuditEvent,
        ).toHaveBeenCalledTimes(1);
        expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
        );
      });
    });

    describe("skip action", () => {
      it("should complete journey with user aborted error when skip is selected", async () => {
        mockRequest.body = {
          action: "skip",
          registrationResponse: JSON.stringify({}),
        };
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];
        mockCompleteJourney.mockResolvedValue(mockReply);

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(
          mockCompleteAllJourneyActionsUnsuccessfully,
        ).toHaveBeenCalledWith(
          {
            code: 1002,
            description: "UserAbortedJourney",
            destroySession: false,
          },
          mockRequest,
          mockReply,
        );
        expect(mockCompleteJourney).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
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
        mockExtractRegistrationResponseInfo.mockReturnValue({
          publicKeyAlgorithm: -7,
        });
      });

      it("should successfully register a passkey", async () => {
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(
          mockSendPasskeyRegistrationSuccessfulAuditEvent,
        ).toHaveBeenCalledWith(mockRequest, mockReply, {
          id: "credential-id",
          rawId: "credential-id",
          response: {
            clientDataJSON: "client-data",
            attestationObject: "attestation-object",
          },
          type: "public-key",
        });
        expect(
          mockSendPasskeyRegistrationSuccessfulAuditEvent,
        ).toHaveBeenCalledTimes(1);

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
            algorithm: -7,
          }),
        );

        expect(
          mockSendPasskeyEnrolmentSuccessfulAuditEvent,
        ).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
          {
            id: "credential-id",
            rawId: "credential-id",
            response: {
              clientDataJSON: "client-data",
              attestationObject: "attestation-object",
            },
            type: "public-key",
          },
          1,
        );

        expect(mockCompleteJourneyActionSuccessfully).toHaveBeenCalledWith(
          {
            action: "passkey-create",
            details: { aaguid: "aaguid-123" },
          },
          mockRequest,
          mockReply,
        );
        expect(mockCompleteJourney).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          true,
        );
      });

      it("should handle passkey without attestation signature", async () => {
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];
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

      it("should use 0 as algorithm when publicKeyAlgorithm is undefined", async () => {
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];
        mockExtractRegistrationResponseInfo.mockReturnValue({
          publicKeyAlgorithm: undefined,
        });

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockCreatePasskey).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            algorithm: 0,
          }),
        );
      });

      it("should handle single device credential", async () => {
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];
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

        expect(
          mockSendPasskeyRegistrationSuccessfulAuditEvent,
        ).toHaveBeenCalledWith(mockRequest, mockReply, {
          id: "credential-id",
          rawId: "credential-id",
          response: {
            clientDataJSON: "client-data",
            attestationObject: "attestation-object",
          },
          type: "public-key",
        });
        expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
          {
            id: "credential-id",
            rawId: "credential-id",
            response: {
              clientDataJSON: "client-data",
              attestationObject: "attestation-object",
            },
            type: "public-key",
          },
          "VerificationError - Verification error",
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
        expect(mockAddMetadata).toHaveBeenCalledWith(
          "error_type",
          "VerificationError",
        );
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

        expect(
          mockSendPasskeyRegistrationSuccessfulAuditEvent,
        ).toHaveBeenCalledWith(mockRequest, mockReply, {
          id: "credential-id",
          rawId: "credential-id",
          response: {
            clientDataJSON: "client-data",
            attestationObject: "attestation-object",
          },
          type: "public-key",
        });
        expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
          {
            id: "credential-id",
            rawId: "credential-id",
            response: {
              clientDataJSON: "client-data",
              attestationObject: "attestation-object",
            },
            type: "public-key",
          },
          "VerificationFailed",
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
        expect(mockAddMetadata).toHaveBeenCalledWith(
          "error_type",
          "VerificationFailed",
        );
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
      });

      it("should send notification with passkey name when aaguid is found", async () => {
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];
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
          notificationType: "CREATE_PASSKEY_WITH_DISPLAY_NAME",
          emailAddress: "test@example.com",
          passkeyName: "iCloud Keychain",
        });
      });

      it("should send notification without passkey name when aaguid is not found", async () => {
        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];
        mockGetPasskeyConvenienceMetadataByAaguid.mockResolvedValue(undefined);

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(mockGetPasskeyConvenienceMetadataByAaguid).toHaveBeenCalledWith(
          "aaguid-123",
        );
        expect(mockSendNotification).toHaveBeenCalledWith({
          notificationType: "CREATE_PASSKEY_WITHOUT_DISPLAY_NAME",
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

        expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
          {
            id: "credential-id",
            rawId: "credential-id",
            response: {
              clientDataJSON: "client-data",
              attestationObject: "attestation-object",
            },
            type: "public-key",
          },
          "ErrorSavingPasskey",
        );
      });

      it("should show error when registrationError is present", async () => {
        mockRequest.body = {
          action: "register",
          registrationError: "Client error occurred",
          registrationErrorDetails: "Something went wrong",
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
          {
            error: {
              name: "Client error occurred",
              message: "Something went wrong",
            },
          },
          "Register passkey - client error",
        );
        expect(mockAddMetadata).toHaveBeenCalledWith(
          "ClientErrorName",
          "Client error occurred",
        );
        expect(mockAddMetadata).toHaveBeenCalledWith(
          "error_type",
          "ClientError",
        );
        expect(mockAddMetric).toHaveBeenCalledWith(
          "PasskeyCreateError",
          "Count",
          1,
        );
        expect(mockReply.analytics).toStrictEqual(
          expect.objectContaining({
            reason: "UnknownError",
          }),
        );
        expect(
          mockSendPasskeyRegistrationFailedAuditEvent,
        ).toHaveBeenCalledWith(mockRequest, mockReply, "UnknownError");
        expect(
          mockSendPasskeyRegistrationFailedAuditEvent,
        ).toHaveBeenCalledTimes(1);
        expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
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

      it("should complete journey unsuccessfully when user account is blocked after registration", async () => {
        mockGetUserAisStatus.mockResolvedValue({
          success: true,
          result: {
            state: {
              blocked: true,
              suspended: false,
              reproveIdentity: false,
              resetPassword: false,
            },
          },
        });
        mockCompleteJourney.mockResolvedValue(mockReply);

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(
          mockCompleteAllJourneyActionsUnsuccessfully,
        ).toHaveBeenCalledWith(
          {
            code: 1004,
            description: "AccountHasInterventions",
            destroySession: false,
            extras: {
              accountInterventionsStatus: {
                state: {
                  blocked: true,
                  suspended: false,
                  reproveIdentity: false,
                  resetPassword: false,
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
      });

      it("should complete journey unsuccessfully when user account is suspended after registration", async () => {
        mockGetUserAisStatus.mockResolvedValue({
          success: true,
          result: {
            state: {
              blocked: false,
              suspended: true,
              reproveIdentity: false,
              resetPassword: false,
            },
          },
        });
        mockCompleteJourney.mockResolvedValue(mockReply);

        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );

        expect(
          mockCompleteAllJourneyActionsUnsuccessfully,
        ).toHaveBeenCalledWith(
          {
            code: 1004,
            description: "AccountHasInterventions",
            destroySession: false,
            extras: {
              accountInterventionsStatus: {
                state: {
                  blocked: false,
                  suspended: true,
                  reproveIdentity: false,
                  resetPassword: false,
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

        expect(mockSendPasskeyEnrolmentFailedAuditEvent).toHaveBeenCalledWith(
          mockRequest,
          mockReply,
          { challenge: "test-challenge" },
          {},
          "UserHasMaximumNumberOfPasskeys",
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

        // @ts-expect-error
        mockRequest.session.journeyActions = [{ action: "passkey-create" }];

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
