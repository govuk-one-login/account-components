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
        "journey-type":
          reply.client?.journey_types_by_scope?.[request.session.claims.scope],
        passkey: {
          passkey_registration_request: {
            passkey_authenticator_attachment:
              registrationOptions.authenticatorSelection
                ?.authenticatorAttachment,
            passkey_request_resident_key:
              registrationOptions.authenticatorSelection?.residentKey,
            passkey_request_supported_algorithms: supportedAlgorithmIDs,
            passkey_request_user_verification:
              registrationOptions.authenticatorSelection?.userVerification,
            passkey_require_resident_key:
              registrationOptions.authenticatorSelection?.requireResidentKey,
          },
        },
      },
      restricted: {
        ...commonAuditEventProps.restricted,
        passkey: {
          // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
          passkey_excluded_credentials:
            registrationOptions.excludeCredentials?.map((cred) => ({
              passkey_credential_id: cred.id,
              passkey_credential_transports: cred.transports,
            })) ?? [],
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

  const parsedReason = v.safeParse(
    v.picklist([
      "AbortError",
      "ConstraintError",
      "InvalidStateError",
      "NotAllowedError",
      "NotSupportedError",
      "SecurityError",
      "TypeError",
      "UnknownError",
    ]),
    reason,
  );

  await sendAuditEvent(
    createEvent("AMC_PASSKEY_REGISTRATION_FAILED", {
      ...commonAuditEventProps,
      event_name: "AMC_PASSKEY_REGISTRATION_FAILED",
      client_id: request.session.claims.client_id,
      extensions: {
        "journey-type":
          reply.client?.journey_types_by_scope?.[request.session.claims.scope],
        passkey: {
          passkey_registration_failure_reason: parsedReason.success
            ? parsedReason.output
            : undefined,
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
        passkey: {
          passkey_aaguid: responseInfo.aaguid,
          passkey_counter: responseInfo.counter,
          passkey_credential_backed_up: responseInfo.credentialBackedUp,
          passkey_credential_device_type: responseInfo.credentialDeviceType,
          // @ts-expect-error - will error until "cable" is added to the transports type. Once it has been added then this comment can be removed.
          passkey_credential_transports: responseInfo.credentialTransports,
          passkey_fmt: responseInfo.fmt,
          passkey_public_key_algorithm: responseInfo.publicKeyAlgorithm,
          passkey_user_verified: responseInfo.userVerified,
        },
      },
      restricted: {
        ...commonAuditEventProps.restricted,
        passkey: {
          passkey_credential_id: responseInfo.credentialId,
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
