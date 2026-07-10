import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import * as v from "valibot";
import {
  decodeAttestationObject,
  isoUint8Array,
} from "@simplewebauthn/server/helpers";
import { completeJourney } from "../../utils/completeJourney.js";
import { AccountDataApiClient } from "../../../utils/accountDataApiClient.js";
import {
  getFormErrors,
  getFormErrorsList,
} from "../../../utils/formErrorsHelpers.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { paths } from "../../../utils/paths.js";
import {
  NotificationType,
  sendNotification,
} from "../../../../../commons/utils/notifications/index.js";
import { getPasskeyConvenienceMetadataByAaguid } from "../../../../../commons/utils/passkeysConvenienceMetadata/index.js";
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";
import {
  completeJourneyActionSuccessfully,
  unsuccessfulJourneyActionErrors,
  startJourneyAction,
  completeAllJourneyActionsUnsuccessfully,
} from "../../utils/journeyActions.js";
import {
  sendPasskeyRegistrationGeneratedAuditEvent,
  sendPasskeyRegistrationFailedAuditEvent,
  sendPasskeyRegistrationSuccessfulAuditEvent,
  sendPasskeyEnrolmentFailedAuditEvent,
  sendPasskeyEnrolmentSuccessfulAuditEvent,
  passkeyRegistrationFailureReason,
} from "../utils/auditEvents/index.js";
import { extractRegistrationResponseInfo } from "../utils/extractRegistrationResponseInfo/index.js";
import { AccountInterventionsServiceApiClient } from "../../../utils/accountInterventionsServiceApiClient.js";

export const postBodySchema = v.object({
  action: v.optional(v.picklist(["register", "skip"])),
  registrationError: v.optional(v.string()),
  registrationErrorDetails: v.optional(v.string()),
  registrationResponse: v.pipe(v.string(), v.parseJson()),
});

export const supportedAlgorithmIDs = [
  -7, // ES256
  -8, // EdDSA
  -257, // RS256
];

const setRegistrationOptions = async (
  request: FastifyRequest,
  reply: FastifyReply,
  idsOfCredentialsToExclude: string[],
) => {
  assert.ok(request.session.claims);
  assert.ok(reply.journeyStates?.["passkey-create"]);
  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_RP_NAME"]);
  assert.ok(request.session.expires);

  const timeoutBuffer = 5000; // Buffer to allow enough time for the registration to be completed

  const registrationOptions = await generateRegistrationOptions({
    rpName: process.env["PASSKEYS_RP_NAME"],
    rpID: process.env["PASSKEYS_RP_ID"],
    userName: request.session.claims.email,
    userID: isoUint8Array.fromUTF8String(request.session.claims.public_sub),
    attestationType: "direct",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    supportedAlgorithmIDs,
    excludeCredentials: idsOfCredentialsToExclude.map((id) => ({
      id,
    })),
    timeout: Math.max(
      request.session.expires * 1000 - timeoutBuffer - Date.now(),
      1, // 1 not 0, just in case some authenticators interpret 0 as unlimited
    ),
  });

  reply.journeyStates["passkey-create"].send({
    type: "updateRegistrationOptions",
    registrationOptions,
  });

  await sendPasskeyRegistrationGeneratedAuditEvent(
    request,
    reply,
    registrationOptions,
  );

  return registrationOptions;
};

const getStringsSuffix = (reply: FastifyReply) => {
  return reply.client?.consider_user_logged_in ? "_signedIn" : "_signedOut";
};

const render = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options?: {
    showErrorUi?: boolean;
    [key: string]: unknown;
  },
) => {
  const stringsSuffix = getStringsSuffix(reply);

  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_data_api_access_token);
  const accountDataApiClient = new AccountDataApiClient(
    request.session.claims.account_data_api_access_token,
    request.awsLambda?.event,
  );

  const getPasskeysResult = await accountDataApiClient.getPasskeys(
    request.session.claims.public_sub,
  );

  if (!getPasskeysResult.success) {
    throw new Error(getPasskeysResult.error);
  }

  const registrationOptions = await setRegistrationOptions(
    request,
    reply,
    getPasskeysResult.result.passkeys.map((pk) => pk.id),
  );

  assert.ok(reply.render);

  const errorContentIds = {
    loggedIn: "e71140bc-bd4d-4ea2-9716-5bbb36c696dd",
    notLoggedIn: "c1d63d4a-1be0-4098-8feb-3aae27c67b85",
  };

  const nonErrorContentIds = {
    loggedIn: "980afc26-cd94-452a-9624-29ede30e1bf3",
    notLoggedIn: "5693e0d5-281e-4ab8-b458-422585f20dfc",
  };

  const contentIds = options?.showErrorUi
    ? errorContentIds
    : nonErrorContentIds;

  reply.analytics = {
    ...reply.analytics,
    contentId: reply.client?.consider_user_logged_in
      ? contentIds.loggedIn
      : contentIds.notLoggedIn,
  };

  await reply.render("journeys/passkey-create/templates/create.njk", {
    ...options,
    registrationOptions: JSON.stringify(registrationOptions),
    stringsSuffix,
    formAction:
      paths.journeys["passkey-create"].NOT_CREATED.cannotSetUpPasskey.path,
  });
};

const addErrorMetric = (reason: string) => {
  metrics.addMetadata("error_type", reason);
  metrics.addMetric("PasskeyCreateError", MetricUnit.Count, 1);
};

const getUserAisStatus = async (request: FastifyRequest) => {
  assert.ok(request.session.claims);

  const accountInterventionsServiceApiClient =
    new AccountInterventionsServiceApiClient(
      request.session.claims
        .stubs_account_interventions_service_api_access_token,
      request.awsLambda?.event,
    );

  return await accountInterventionsServiceApiClient.getUserAisStatus(
    request.session.claims.sub,
  );
};

export async function getHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  showErrorUi = false,
) {
  if (!showErrorUi) {
    await startJourneyAction<"passkeyCreate">(
      { action: "passkey-create" },
      request,
      reply,
    );
  }

  const userAisStatus = await getUserAisStatus(request);
  if (
    userAisStatus.success &&
    (userAisStatus.result.state.blocked || userAisStatus.result.state.suspended)
  ) {
    await completeAllJourneyActionsUnsuccessfully(
      {
        ...unsuccessfulJourneyActionErrors.accountHasInterventions,
        extras: {
          accountInterventionsStatus: userAisStatus.result,
        },
      },
      request,
      reply,
    );

    return await completeJourney(request, reply, false);
  }

  await render(request, reply, {
    showErrorUi,
  });
  return reply;
}

export async function postHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(reply.journeyStates?.["passkey-create"]);

  const registrationOptions =
    reply.journeyStates["passkey-create"].getSnapshot().context
      .registrationOptions;
  assert.ok(registrationOptions);

  const stringsSuffix = getStringsSuffix(reply);

  const bodyParseResult = v.safeParse(postBodySchema, request.body);

  if (!bodyParseResult.success) {
    request.log.warn(
      { issues: bodyParseResult.issues },
      "Register passkey - invalid request body",
    );
    const invalidRequestBodyErrorReason = "InvalidRequestBody";
    addErrorMetric(invalidRequestBodyErrorReason);

    reply.analytics = {
      ...reply.analytics,
      reason: invalidRequestBodyErrorReason,
    };

    await sendPasskeyRegistrationFailedAuditEvent(request, reply);
    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
    );

    await render(request, reply, {
      showErrorUi: true,
    });
    return reply;
  }

  const body = bodyParseResult.output;

  if (body.action === undefined) {
    const formErrors = getFormErrors([
      {
        msg: request.i18n.t(
          `journey:create.error.mustSelectAnActionErrorMessage${stringsSuffix}`,
        ),
        fieldId: "action",
      },
    ]);

    await render(request, reply, {
      showErrorUi: true,
      errors: formErrors,
      errorList: getFormErrorsList(formErrors),
    });
    return reply;
  }

  if (body.action === "skip") {
    await completeAllJourneyActionsUnsuccessfully(
      unsuccessfulJourneyActionErrors.userAbortedJourney,
      request,
      reply,
    );

    return await completeJourney(request, reply, false);
  }

  if (body.registrationError !== undefined) {
    request.log.warn(
      {
        error: {
          name: body.registrationError,
          message: body.registrationErrorDetails,
        },
      },
      "Register passkey - client error",
    );
    metrics.addMetadata("ClientErrorName", body.registrationError);
    addErrorMetric("ClientError");

    const reason = v.parse(
      v.fallback(v.picklist(passkeyRegistrationFailureReason), "UnknownError"),
      body.registrationError,
    );

    reply.analytics = {
      ...reply.analytics,
      reason,
    };

    await sendPasskeyRegistrationFailedAuditEvent(request, reply, reason);
    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
    );

    await render(request, reply, {
      showErrorUi: true,
    });
    return reply;
  }

  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_EXPECTED_ORIGIN"]);

  await sendPasskeyRegistrationSuccessfulAuditEvent(
    request,
    reply,
    body.registrationResponse,
  );

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      // @ts-expect-error - the library's typing is too strict. This function
      // should accept any type for `response` because it is this function
      // which does the validation.
      response: body.registrationResponse,
      expectedChallenge: registrationOptions.challenge,
      expectedOrigin: process.env["PASSKEYS_EXPECTED_ORIGIN"],
      expectedRPID: process.env["PASSKEYS_RP_ID"],
    });
  } catch (error) {
    request.log.warn({ error }, "Register passkey - verification error");
    addErrorMetric("VerificationError");

    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
      body.registrationResponse,
      `VerificationError${error instanceof Error ? " - " + error.message : ""}`,
    );

    await render(request, reply, {
      showErrorUi: true,
    });
    return reply;
  }

  if (!verification.verified) {
    request.log.warn("Register passkey - verification failed");
    addErrorMetric("VerificationFailed");

    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
      body.registrationResponse,
      "VerificationFailed",
    );

    await render(request, reply, {
      showErrorUi: true,
    });
    return reply;
  }

  const decodedAttestation = decodeAttestationObject(
    verification.registrationInfo.attestationObject,
  );
  const attestationStatement = decodedAttestation.get("attStmt");
  const attestationSignature = attestationStatement.get("sig");

  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_data_api_access_token);
  const accountDataApiClient = new AccountDataApiClient(
    request.session.claims.account_data_api_access_token,
    request.awsLambda?.event,
  );

  const getPasskeysResult = await accountDataApiClient.getPasskeys(
    request.session.claims.public_sub,
  );

  if (!getPasskeysResult.success) {
    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
      body.registrationResponse,
      "ErrorGettingExistingPasskeysForUser",
    );

    throw new Error(getPasskeysResult.error);
  }

  const appConfig = await getAppConfig();

  if (
    getPasskeysResult.result.passkeys.length >= appConfig.max_number_of_passkeys
  ) {
    request.log.warn("Register passkey - user has maximum number of passkeys");
    metrics.addMetric("UserHasMaximumNumberOfPasskeys", MetricUnit.Count, 1);

    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
      body.registrationResponse,
      "UserHasMaximumNumberOfPasskeys",
    );

    await render(request, reply, {
      showErrorUi: true,
    });

    return reply;
  }

  const registrationResponseInfo = extractRegistrationResponseInfo(
    body.registrationResponse,
  );

  const userAisStatus = await getUserAisStatus(request);
  if (
    userAisStatus.success &&
    (userAisStatus.result.state.blocked || userAisStatus.result.state.suspended)
  ) {
    await completeAllJourneyActionsUnsuccessfully(
      {
        ...unsuccessfulJourneyActionErrors.accountHasInterventions,
        extras: {
          accountInterventionsStatus: userAisStatus.result,
        },
      },
      request,
      reply,
    );

    return await completeJourney(request, reply, false);
  }

  const savePasskeyResult = await accountDataApiClient.createPasskey(
    request.session.claims.public_sub,
    {
      credential: Buffer.from(
        verification.registrationInfo.credential.publicKey,
      ).toString("base64url"),
      id: verification.registrationInfo.credential.id,
      aaguid: verification.registrationInfo.aaguid,
      isAttested: attestationSignature !== undefined,
      signCount: verification.registrationInfo.credential.counter,
      transports: verification.registrationInfo.credential.transports ?? [],
      isBackedUp: verification.registrationInfo.credentialBackedUp,
      isBackUpEligible:
        verification.registrationInfo.credentialDeviceType === "multiDevice",
      isResidentKey: true,
      algorithm: registrationResponseInfo.publicKeyAlgorithm ?? 0,
    },
  );

  if (!savePasskeyResult.success) {
    await sendPasskeyEnrolmentFailedAuditEvent(
      request,
      reply,
      registrationOptions,
      body.registrationResponse,
      "ErrorSavingPasskey",
    );

    throw new Error(savePasskeyResult.error);
  }

  const passkeyConvenienceMetadata =
    await getPasskeyConvenienceMetadataByAaguid(
      verification.registrationInfo.aaguid,
    );

  await sendNotification(
    passkeyConvenienceMetadata
      ? {
          notificationType: NotificationType.CREATE_PASSKEY_WITH_DISPLAY_NAME,
          emailAddress: request.session.claims.email,
          passkeyName: passkeyConvenienceMetadata.name,
        }
      : {
          notificationType:
            NotificationType.CREATE_PASSKEY_WITHOUT_DISPLAY_NAME,
          emailAddress: request.session.claims.email,
        },
  );

  await sendPasskeyEnrolmentSuccessfulAuditEvent(
    request,
    reply,
    registrationOptions,
    body.registrationResponse,
    getPasskeysResult.result.passkeys.length + 1,
  );

  await completeJourneyActionSuccessfully<"passkeyCreate">(
    {
      action: "passkey-create",
      details: { aaguid: verification.registrationInfo.aaguid },
    },
    request,
    reply,
  );

  return await completeJourney(request, reply, true);
}
