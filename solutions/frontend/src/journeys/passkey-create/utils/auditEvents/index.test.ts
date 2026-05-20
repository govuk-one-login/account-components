import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifySessionObject } from "@fastify/session";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const mockCreateEvent = vi.fn((_, props) => props);
const mockGetCommonAuditEventProps = vi.fn();
const mockSendAuditEvent = vi.fn();
const mockExtractRegistrationResponseInfo = vi.fn();

vi.mock(import("@govuk-one-login/event-catalogue-utils"), () => ({
  createEvent: mockCreateEvent,
}));

vi.mock(import("../../../../../../commons/utils/auditEvents/index.js"), () => ({
  getCommonAuditEventProps: mockGetCommonAuditEventProps,
  sendAuditEvent: mockSendAuditEvent,
}));

vi.mock(import("../extractRegistrationResponseInfo/index.js"), () => ({
  extractRegistrationResponseInfo: mockExtractRegistrationResponseInfo,
}));

// @ts-expect-error
vi.mock(import("../../handlers/create.js"), () => ({
  supportedAlgorithmIDs: [-7, -8, -25],
  postBodySchema: {},
}));

const {
  sendPasskeyRegistrationGeneratedAuditEvent,
  sendPasskeyRegistrationFailedAuditEvent,
  sendPasskeyRegistrationSuccessfulAuditEvent,
} = await import("./index.js");

describe("passkey-create audit events", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      session: {
        claims: {
          email: "test@example.com",
          sub: "user-123",
          client_id: "client-123",
          scope: "passkey-create",
        },
      },
      awsLambda: {
        event: { headers: {} },
        context: {},
      },
    } as FastifyRequest;

    mockReply = {
      client: {
        journey_types_by_scope: {
          "passkey-create": "registration",
        },
      } as unknown as FastifyReply["client"],
    } as FastifyReply;

    mockGetCommonAuditEventProps.mockReturnValue({
      timestamp: 1000,
      event_timestamp_ms: 1000000,
      component_id: "AMC",
      user: {
        session_id: "session-123",
        persistent_session_id: "persistent-456",
        ip_address: "192.168.1.1",
        govuk_signin_journey_id: "client-789",
      },
      restricted: {
        device_information: { encoded: "encoded-data" },
      },
    });
  });

  describe("sendPasskeyRegistrationGeneratedAuditEvent", () => {
    const registrationOptions = {
      challenge: "test-challenge",
      authenticatorSelection: {
        residentKey: "required" as const,
        userVerification: "required" as const,
        requireResidentKey: true,
        authenticatorAttachment: "platform",
      },
      excludeCredentials: [
        { id: "cred-1", transports: ["internal" as const] },
        { id: "cred-2", transports: ["hybrid" as const, "internal" as const] },
      ],
    };

    it("sends audit event with correct properties", async () => {
      await sendPasskeyRegistrationGeneratedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        registrationOptions as PublicKeyCredentialCreationOptionsJSON,
      );

      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_PASSKEY_REGISTRATION_GENERATED",
        expect.objectContaining({
          event_name: "AMC_PASSKEY_REGISTRATION_GENERATED",
          client_id: "client-123",
          extensions: {
            "journey-type": "registration",
            passkey: {
              passkey_registration_request: {
                passkey_authenticator_attachment: "platform",
                passkey_request_resident_key: "required",
                passkey_request_supported_algorithms: [-7, -8, -25],
                passkey_request_user_verification: "required",
                passkey_require_resident_key: true,
              },
            },
          },
          restricted: {
            device_information: { encoded: "encoded-data" },
            passkey: {
              passkey_excluded_credentials: [
                {
                  passkey_credential_id: "cred-1",
                  passkey_credential_transports: ["internal"],
                },
                {
                  passkey_credential_id: "cred-2",
                  passkey_credential_transports: ["hybrid", "internal"],
                },
              ],
            },
          },
          user: {
            session_id: "session-123",
            persistent_session_id: "persistent-456",
            ip_address: "192.168.1.1",
            govuk_signin_journey_id: "client-789",
            email: "test@example.com",
            user_id: "user-123",
          },
        }),
      );
      expect(mockSendAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "AMC_PASSKEY_REGISTRATION_GENERATED",
        }),
      );
    });

    it("maps empty excludeCredentials to empty array", async () => {
      await sendPasskeyRegistrationGeneratedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        {
          ...registrationOptions,
          excludeCredentials: undefined,
        } as unknown as PublicKeyCredentialCreationOptionsJSON,
      );

      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_PASSKEY_REGISTRATION_GENERATED",
        expect.objectContaining({
          restricted: expect.objectContaining({
            passkey: {
              passkey_excluded_credentials: [],
            },
          }),
        }),
      );
    });

    it("excludes journey-type when not available for scope", async () => {
      delete mockReply.client;

      await sendPasskeyRegistrationGeneratedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        registrationOptions as PublicKeyCredentialCreationOptionsJSON,
      );

      const eventPayload = mockCreateEvent.mock.calls[0]?.[1];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(eventPayload.extensions).not.toHaveProperty("journey-type");
    });

    it("excludes optional authenticatorSelection properties when not present", async () => {
      await sendPasskeyRegistrationGeneratedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        {
          ...registrationOptions,
          authenticatorSelection: {},
        } as unknown as PublicKeyCredentialCreationOptionsJSON,
      );

      const passkey_registration_request =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        mockCreateEvent.mock.calls[0]?.[1].extensions.passkey
          .passkey_registration_request;

      expect(passkey_registration_request).not.toHaveProperty(
        "passkey_authenticator_attachment",
      );
      expect(passkey_registration_request).not.toHaveProperty(
        "passkey_request_resident_key",
      );
      expect(passkey_registration_request).not.toHaveProperty(
        "passkey_request_user_verification",
      );
      expect(passkey_registration_request).not.toHaveProperty(
        "passkey_require_resident_key",
      );
      expect(passkey_registration_request).toHaveProperty(
        "passkey_request_supported_algorithms",
        [-7, -8, -25],
      );
    });

    it("returns early when awsLambda event is not present", async () => {
      delete mockRequest.awsLambda;

      await sendPasskeyRegistrationGeneratedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        registrationOptions as PublicKeyCredentialCreationOptionsJSON,
      );

      expect(mockSendAuditEvent).not.toHaveBeenCalled();
    });

    it("throws when session claims are missing", async () => {
      mockRequest.session = {} as FastifySessionObject;

      await expect(
        sendPasskeyRegistrationGeneratedAuditEvent(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
          registrationOptions as PublicKeyCredentialCreationOptionsJSON,
        ),
      ).rejects.toThrow();
    });
  });

  describe("sendPasskeyRegistrationFailedAuditEvent", () => {
    it("sends audit event with failure reason when reason is a known error", async () => {
      await sendPasskeyRegistrationFailedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        "NotAllowedError",
      );

      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_PASSKEY_REGISTRATION_FAILED",
        expect.objectContaining({
          event_name: "AMC_PASSKEY_REGISTRATION_FAILED",
          client_id: "client-123",
          extensions: {
            "journey-type": "registration",
            passkey: {
              passkey_registration_failure_reason: "NotAllowedError",
            },
          },
          user: {
            session_id: "session-123",
            persistent_session_id: "persistent-456",
            ip_address: "192.168.1.1",
            govuk_signin_journey_id: "client-789",
            email: "test@example.com",
            user_id: "user-123",
          },
        }),
      );
      expect(mockSendAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "AMC_PASSKEY_REGISTRATION_FAILED",
        }),
      );
    });

    it("excludes failure reason when reason is not a known error", async () => {
      await sendPasskeyRegistrationFailedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        "ClientError",
      );

      const eventPayload = mockCreateEvent.mock.calls[0]?.[1];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(eventPayload.extensions.passkey).not.toHaveProperty(
        "passkey_registration_failure_reason",
      );
    });

    it("excludes journey-type when not available for scope", async () => {
      delete mockReply.client;

      await sendPasskeyRegistrationFailedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        "NotAllowedError",
      );

      const eventPayload = mockCreateEvent.mock.calls[0]?.[1];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(eventPayload.extensions).not.toHaveProperty("journey-type");
    });

    it("returns early when awsLambda event is not present", async () => {
      delete mockRequest.awsLambda;

      await sendPasskeyRegistrationFailedAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        "ClientError",
      );

      expect(mockSendAuditEvent).not.toHaveBeenCalled();
    });

    it("throws when session claims are missing", async () => {
      mockRequest.session = {} as FastifySessionObject;

      await expect(
        sendPasskeyRegistrationFailedAuditEvent(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
          "ClientError",
        ),
      ).rejects.toThrow();
    });
  });

  describe("sendPasskeyRegistrationSuccessfulAuditEvent", () => {
    const registrationResponse = {
      id: "credential-id",
      rawId: "credential-id",
      response: {
        clientDataJSON: "client-data",
        attestationObject: "attestation-object",
      },
      type: "public-key",
    };

    beforeEach(() => {
      mockExtractRegistrationResponseInfo.mockReturnValue({
        credentialId: "credential-id-base64url",
        aaguid: "00000000-0000-0000-0000-000000000000",
        counter: 0,
        credentialBackedUp: true,
        userVerified: true,
        publicKeyAlgorithm: -7,
        credentialDeviceType: "multi-device",
        credentialTransports: ["hybrid", "internal"],
        fmt: "packed",
      });
    });

    it("sends audit event with registration response info", async () => {
      await sendPasskeyRegistrationSuccessfulAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        registrationResponse,
      );

      expect(mockExtractRegistrationResponseInfo).toHaveBeenCalledWith(
        registrationResponse,
      );
      expect(mockCreateEvent).toHaveBeenCalledWith(
        "AMC_PASSKEY_REGISTRATION_SUCCESSFUL",
        expect.objectContaining({
          event_name: "AMC_PASSKEY_REGISTRATION_SUCCESSFUL",
          client_id: "client-123",
          extensions: {
            "journey-type": "registration",
            passkey: {
              passkey_aaguid: "00000000-0000-0000-0000-000000000000",
              passkey_counter: 0,
              passkey_credential_backed_up: true,
              passkey_credential_device_type: "multi-device",
              passkey_credential_transports: ["hybrid", "internal"],
              passkey_fmt: "packed",
              passkey_public_key_algorithm: -7,
              passkey_user_verified: true,
            },
          },
          restricted: {
            device_information: { encoded: "encoded-data" },
            passkey: {
              passkey_credential_id: "credential-id-base64url",
            },
          },
          user: {
            session_id: "session-123",
            persistent_session_id: "persistent-456",
            ip_address: "192.168.1.1",
            govuk_signin_journey_id: "client-789",
            email: "test@example.com",
            user_id: "user-123",
          },
        }),
      );
      expect(mockSendAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "AMC_PASSKEY_REGISTRATION_SUCCESSFUL",
        }),
      );
    });

    it("excludes passkey_credential_id when credentialId is undefined", async () => {
      mockExtractRegistrationResponseInfo.mockReturnValue({
        credentialId: undefined,
        aaguid: "00000000-0000-0000-0000-000000000000",
        counter: 0,
        credentialBackedUp: true,
        userVerified: true,
        publicKeyAlgorithm: -7,
        credentialDeviceType: "multi-device",
        credentialTransports: ["hybrid", "internal"],
        fmt: "packed",
      });

      await sendPasskeyRegistrationSuccessfulAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        registrationResponse,
      );

      const eventPayload = mockCreateEvent.mock.calls[0]?.[1];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(eventPayload.restricted.passkey).not.toHaveProperty(
        "passkey_credential_id",
      );
    });

    it("returns early when awsLambda event is not present", async () => {
      delete mockRequest.awsLambda;

      await sendPasskeyRegistrationSuccessfulAuditEvent(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        registrationResponse,
      );

      expect(mockSendAuditEvent).not.toHaveBeenCalled();
    });

    it("throws when session claims are missing", async () => {
      mockRequest.session = {} as FastifySessionObject;

      await expect(
        sendPasskeyRegistrationSuccessfulAuditEvent(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
          registrationResponse,
        ),
      ).rejects.toThrow();
    });
  });
});
