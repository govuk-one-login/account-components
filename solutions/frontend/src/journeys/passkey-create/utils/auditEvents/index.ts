import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { createEvent } from "@govuk-one-login/event-catalogue-utils";
import {
  getCommonAuditEventProps,
  sendAuditEvent,
} from "../../../../../../commons/utils/auditEvents/index.js";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import { extractRegistrationResponseInfo } from "../extractRegistrationResponseInfo/index.js";
import {
  supportedAlgorithmIDs,
  type postBodySchema,
} from "../../handlers/create.js";
import type { InferOutput } from "valibot";
import * as v from "valibot";

const buildRegistrationRequest = (
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
) => ({
  ...(registrationOptions.authenticatorSelection?.authenticatorAttachment !==
    undefined && {
    passkey_authenticator_attachment:
      registrationOptions.authenticatorSelection.authenticatorAttachment,
  }),
  ...(registrationOptions.authenticatorSelection?.residentKey !== undefined && {
    passkey_request_resident_key:
      registrationOptions.authenticatorSelection.residentKey,
  }),
  passkey_request_supported_algorithms: supportedAlgorithmIDs,
  ...(registrationOptions.authenticatorSelection?.userVerification !==
    undefined && {
    passkey_request_user_verification:
      registrationOptions.authenticatorSelection.userVerification,
  }),
  ...(registrationOptions.authenticatorSelection?.requireResidentKey !==
    undefined && {
    passkey_require_resident_key:
      registrationOptions.authenticatorSelection.requireResidentKey,
  }),
});

const buildExcludedCredentials = (
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
) =>
  registrationOptions.excludeCredentials?.map((cred) => ({
    passkey_credential_id: cred.id,
    ...(cred.transports !== undefined && {
      passkey_credential_transports: cred.transports,
    }),
  })) ?? [];

const buildResponseInfoPasskeyFields = (
  responseInfo: ReturnType<typeof extractRegistrationResponseInfo>,
) => ({
  ...(responseInfo.aaguid !== undefined && {
    passkey_aaguid: responseInfo.aaguid,
  }),
  ...(responseInfo.counter !== undefined && {
    passkey_counter: responseInfo.counter,
  }),
  ...(responseInfo.credentialBackedUp !== undefined && {
    passkey_credential_backed_up: responseInfo.credentialBackedUp,
  }),
  ...(responseInfo.credentialDeviceType !== undefined && {
    passkey_credential_device_type: responseInfo.credentialDeviceType,
  }),
  ...(responseInfo.credentialTransports !== undefined && {
    passkey_credential_transports: responseInfo.credentialTransports,
  }),
  ...(responseInfo.fmt !== undefined && {
    passkey_fmt: responseInfo.fmt,
  }),
  ...(responseInfo.publicKeyAlgorithm !== undefined && {
    passkey_public_key_algorithm: responseInfo.publicKeyAlgorithm,
  }),
  ...(responseInfo.userVerified !== undefined && {
    passkey_user_verified: responseInfo.userVerified,
  }),
});

const getBaseEventProps = (request: FastifyRequest, reply: FastifyReply) => {
  assert.ok(request.session.claims);

  if (!request.awsLambda?.event) return undefined;

  const commonAuditEventProps = getCommonAuditEventProps(
    request.awsLambda.event,
  );

  return {
    commonAuditEventProps,
    claims: request.session.claims,
    journeyType:
      reply.client?.journey_types_by_scope?.[request.session.claims.scope],
    user: {
      ...commonAuditEventProps.user,
      email: request.session.claims.email,
      user_id: request.session.claims.sub,
    },
  };
};

const buildEnrolmentEventPayload = (
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
  registrationResponse: InferOutput<
    typeof postBodySchema
  >["registrationResponse"],
) => {
  const responseInfo = extractRegistrationResponseInfo(registrationResponse);

  return {
    responseInfo,
    extensions: {
      ...buildResponseInfoPasskeyFields(responseInfo),
      passkey_registration_request:
        buildRegistrationRequest(registrationOptions),
    },
    restricted: {
      ...(responseInfo.credentialId !== undefined && {
        passkey_credential_id: responseInfo.credentialId,
      }),
      passkey_excluded_credentials:
        buildExcludedCredentials(registrationOptions),
    },
  };
};

export const sendPasskeyRegistrationGeneratedAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
) => {
  const base = getBaseEventProps(request, reply);
  if (!base) return;

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_REGISTRATION_GENERATED", {
      ...base.commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_GENERATED",
      client_id: base.claims.client_id,
      extensions: {
        ...(base.journeyType !== undefined && {
          "journey-type": base.journeyType,
        }),
        passkey: {
          passkey_registration_request:
            buildRegistrationRequest(registrationOptions),
        },
      },
      restricted: {
        ...base.commonAuditEventProps.restricted,
        passkey: {
          // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
          passkey_excluded_credentials:
            buildExcludedCredentials(registrationOptions),
        },
      },
      user: base.user,
    }),
  );
};

export const sendPasskeyRegistrationFailedAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  reason: string,
) => {
  const base = getBaseEventProps(request, reply);
  if (!base) return;

  const parsedReason = v.parse(
    v.fallback(
      v.picklist([
        "JavaScriptNotEnabled",
        "BrowserDoesNotSupportWebAuthn",
        "AbortError",
        "ConstraintError",
        "InvalidStateError",
        "NotAllowedError",
        "NotSupportedError",
        "SecurityError",
        "TypeError",
        "UnknownError",
      ]),
      "UnknownError",
    ),
    reason,
  );

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_REGISTRATION_FAILED", {
      ...base.commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_FAILED",
      client_id: base.claims.client_id,
      extensions: {
        "journey-type": base.journeyType,
        passkey: {
          // @ts-expect-error - will error until "JavaScriptNotEnabled" and "BrowserDoesNotSupportWebAuthn" are added to the failure reasons type. Once they have been added then this comment can be removed.
          passkey_registration_failure_reason: parsedReason,
        },
      },
      user: base.user,
    }),
  );
};

export const sendPasskeyRegistrationSuccessfulAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  registrationResponse: InferOutput<
    typeof postBodySchema
  >["registrationResponse"],
) => {
  const base = getBaseEventProps(request, reply);
  if (!base) return;

  const responseInfo = extractRegistrationResponseInfo(registrationResponse);

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_REGISTRATION_SUCCESSFUL", {
      ...base.commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_SUCCESSFUL",
      client_id: base.claims.client_id,
      extensions: {
        "journey-type": base.journeyType,
        // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
        passkey: buildResponseInfoPasskeyFields(responseInfo),
      },
      restricted: {
        ...base.commonAuditEventProps.restricted,
        passkey: {
          ...(responseInfo.credentialId !== undefined && {
            passkey_credential_id: responseInfo.credentialId,
          }),
        },
      },
      user: base.user,
    }),
  );
};

export const sendPasskeyEnrolmentFailedAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
  registrationResponse: InferOutput<
    typeof postBodySchema
  >["registrationResponse"],
  reason: string,
) => {
  const base = getBaseEventProps(request, reply);
  if (!base) return;

  const enrolment = buildEnrolmentEventPayload(
    registrationOptions,
    registrationResponse,
  );

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_ENROLMENT_FAILED", {
      ...base.commonAuditEventProps,
      event_name: "AMC_PASSKEY_ENROLMENT_FAILED",
      client_id: base.claims.client_id,
      extensions: {
        "journey-type": base.journeyType,
        passkey: {
          ...enrolment.extensions,
          // @ts-expect-error - will error until passkey_enrolment_failure_reason os updated to be a string rather than an enum. Once it has been updated then this comment can be removed.
          passkey_enrolment_failure_reason: reason,
        },
      },
      restricted: {
        ...base.commonAuditEventProps.restricted,
        // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
        passkey: enrolment.restricted,
      },
      user: base.user,
    }),
  );
};

export const sendPasskeyEnrolmentSuccessfulAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
  registrationResponse: InferOutput<
    typeof postBodySchema
  >["registrationResponse"],
  passkeyCount: number,
) => {
  const base = getBaseEventProps(request, reply);
  if (!base) return;

  const enrolment = buildEnrolmentEventPayload(
    registrationOptions,
    registrationResponse,
  );

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_ENROLMENT_SUCCESSFUL", {
      ...base.commonAuditEventProps,
      event_name: "AMC_PASSKEY_ENROLMENT_SUCCESSFUL",
      client_id: base.claims.client_id,
      extensions: {
        "journey-type": base.journeyType,
        // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
        passkey: enrolment.extensions,
      },
      restricted: {
        ...base.commonAuditEventProps.restricted,
        // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
        passkey: enrolment.restricted,
      },
      user: {
        ...base.user,
        passkey_count: passkeyCount,
      },
    }),
  );
};
