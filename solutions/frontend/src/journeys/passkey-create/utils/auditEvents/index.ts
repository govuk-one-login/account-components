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

export const sendPasskeyRegistrationGeneratedAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  registrationOptions: PublicKeyCredentialCreationOptionsJSON,
) => {
  assert.ok(request.session.claims);

  if (!request.awsLambda?.event) return;

  const commonAuditEventProps = getCommonAuditEventProps(
    request.awsLambda.event,
  );

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_REGISTRATION_GENERATED", {
      ...commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_GENERATED",
      client_id: request.session.claims.client_id,
      extensions: {
        ...(reply.client?.journey_types_by_scope?.[
          request.session.claims.scope
        ] !== undefined && {
          "journey-type":
            reply.client.journey_types_by_scope[request.session.claims.scope],
        }),
        passkey: {
          passkey_registration_request:
            buildRegistrationRequest(registrationOptions),
        },
      },
      restricted: {
        ...commonAuditEventProps.restricted,
        passkey: {
          // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
          passkey_excluded_credentials:
            buildExcludedCredentials(registrationOptions),
        },
      },
      user: {
        ...commonAuditEventProps.user,
        email: request.session.claims.email,
        user_id: request.session.claims.sub,
      },
    }),
  );
};

export const sendPasskeyRegistrationFailedAuditEvent = async (
  request: FastifyRequest,
  reply: FastifyReply,
  reason: string,
) => {
  assert.ok(request.session.claims);

  if (!request.awsLambda?.event) return;

  const commonAuditEventProps = getCommonAuditEventProps(
    request.awsLambda.event,
  );

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
      ...commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_FAILED",
      client_id: request.session.claims.client_id,
      extensions: {
        ...(reply.client?.journey_types_by_scope?.[
          request.session.claims.scope
        ] !== undefined && {
          "journey-type":
            reply.client.journey_types_by_scope[request.session.claims.scope],
        }),
        passkey: {
          // @ts-expect-error - will error until "JavaScriptNotEnabled" and "BrowserDoesNotSupportWebAuthn" are added to the failure reasons type. Once they have been added then this comment can be removed.
          passkey_registration_failure_reason: parsedReason,
        },
      },
      user: {
        ...commonAuditEventProps.user,
        email: request.session.claims.email,
        user_id: request.session.claims.sub,
      },
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
  assert.ok(request.session.claims);

  if (!request.awsLambda?.event) return;

  const commonAuditEventProps = getCommonAuditEventProps(
    request.awsLambda.event,
  );

  const responseInfo = extractRegistrationResponseInfo(registrationResponse);

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_REGISTRATION_SUCCESSFUL", {
      ...commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_SUCCESSFUL",
      client_id: request.session.claims.client_id,
      extensions: {
        "journey-type":
          reply.client?.journey_types_by_scope?.[request.session.claims.scope],
        // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
        passkey: buildResponseInfoPasskeyFields(responseInfo),
      },
      restricted: {
        ...commonAuditEventProps.restricted,
        passkey: {
          ...(responseInfo.credentialId !== undefined && {
            passkey_credential_id: responseInfo.credentialId,
          }),
        },
      },
      user: {
        ...commonAuditEventProps.user,
        email: request.session.claims.email,
        user_id: request.session.claims.sub,
      },
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
  assert.ok(request.session.claims);

  if (!request.awsLambda?.event) return;

  const commonAuditEventProps = getCommonAuditEventProps(
    request.awsLambda.event,
  );

  const responseInfo = extractRegistrationResponseInfo(registrationResponse);

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_ENROLMENT_FAILED", {
      ...commonAuditEventProps,
      event_name: "AMC_PASSKEY_ENROLMENT_FAILED",
      client_id: request.session.claims.client_id,
      extensions: {
        "journey-type":
          reply.client?.journey_types_by_scope?.[request.session.claims.scope],
        passkey: {
          ...buildResponseInfoPasskeyFields(responseInfo),
          passkey_registration_request:
            buildRegistrationRequest(registrationOptions),
          // @ts-expect-error - will error until passkey_enrolment_failure_reason os updated to be a string rather than an enum. Once it has been updated then this comment can be removed.
          passkey_enrolment_failure_reason: reason,
        },
      },
      restricted: {
        ...commonAuditEventProps.restricted,
        passkey: {
          passkey_credential_id: responseInfo.credentialId,
          // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
          passkey_excluded_credentials:
            buildExcludedCredentials(registrationOptions),
        },
      },
      user: {
        ...commonAuditEventProps.user,
        email: request.session.claims.email,
        user_id: request.session.claims.sub,
      },
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
  assert.ok(request.session.claims);

  if (!request.awsLambda?.event) return;

  const commonAuditEventProps = getCommonAuditEventProps(
    request.awsLambda.event,
  );

  const responseInfo = extractRegistrationResponseInfo(registrationResponse);

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_ENROLMENT_SUCCESSFUL", {
      ...commonAuditEventProps,
      event_name: "AMC_PASSKEY_ENROLMENT_SUCCESSFUL",
      client_id: request.session.claims.client_id,
      extensions: {
        "journey-type":
          reply.client?.journey_types_by_scope?.[request.session.claims.scope],
        // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
        passkey: {
          ...buildResponseInfoPasskeyFields(responseInfo),
          passkey_registration_request:
            buildRegistrationRequest(registrationOptions),
        },
      },
      restricted: {
        ...commonAuditEventProps.restricted,
        passkey: {
          passkey_credential_id: responseInfo.credentialId,
          // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
          passkey_excluded_credentials:
            buildExcludedCredentials(registrationOptions),
        },
      },
      user: {
        ...commonAuditEventProps.user,
        email: request.session.claims.email,
        user_id: request.session.claims.sub,
        passkey_count: passkeyCount,
      },
    }),
  );
};
