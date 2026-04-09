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
import { failedJourneyErrors } from "../../utils/failedJourneyErrors.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { paths } from "../../../utils/paths.js";
import {
  NotificationType,
  sendNotification,
} from "../../../../../commons/utils/notifications/index.js";
import { getPasskeyConvenienceMetadataByAaguid } from "../../../../../commons/utils/passkeysConvenienceMetadata/index.js";

const addErrorMetric = (reason: string) => {
  metrics.addDimensions({ error_type: reason });
  metrics.addMetric("PasskeyCreateError", MetricUnit.Count, 1);
};
import { getAppConfig } from "../../../../../commons/utils/getAppConfig/index.js";

const setRegistrationOptions = async (
  request: FastifyRequest,
  reply: FastifyReply,
  idsOfCredentialsToExclude: string[],
) => {
  assert.ok(request.session.claims);
  assert.ok(reply.journeyStates?.["passkey-create"]);
  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_RP_NAME"]);

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
    excludeCredentials: idsOfCredentialsToExclude.map((id) => ({
      id,
    })),
  });

  reply.journeyStates["passkey-create"].send({
    type: "updateRegistrationOptions",
    registrationOptions,
  });

  return registrationOptions;
};

const getStringsSuffix = (reply: FastifyReply) => {
  return reply.client?.consider_user_logged_in ? "_signedIn" : "_signedOut";
};

const render = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options?: {
    stringsSuffix: "_signedIn" | "_signedOut";
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

  await reply.render("journeys/passkey-create/templates/create.njk", {
    ...options,
    registrationOptions: JSON.stringify(registrationOptions),
    stringsSuffix,
    formAction: paths.journeys["passkey-create"].NOT_CREATED.createPost.path,
  });
};

export async function getHandler(request: FastifyRequest, reply: FastifyReply) {
  await render(request, reply);
  return reply;
}

export async function postHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const stringsSuffix = getStringsSuffix(reply);

  const bodySchema = v.object({
    action: v.optional(v.picklist(["register", "skip"])),
    registrationError: v.optional(v.string()),
    registrationResponse: v.pipe(v.string(), v.parseJson()),
  });

  const bodyParseResult = v.safeParse(bodySchema, request.body);

  if (!bodyParseResult.success) {
    request.log.warn(
      { issues: bodyParseResult.issues },
      "Register passkey - invalid request body",
    );
    addErrorMetric("InvalidRequestBody");

    await render(request, reply, {
      stringsSuffix,
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
      stringsSuffix,
      showErrorUi: true,
      errors: formErrors,
      errorList: getFormErrorsList(formErrors),
    });
    return reply;
  }

  if (body.action === "skip") {
    return await completeJourney(
      request,
      reply,
      {
        error: failedJourneyErrors.userAbortedJourney,
      },
      false,
    );
  }

  if (body.registrationError !== undefined) {
    request.log.warn(
      { error: body.registrationError },
      "Register passkey - client error",
    );
    metrics.addMetadata("ClientErrorMessage", body.registrationError);
    addErrorMetric("ClientError");

    await render(request, reply, {
      stringsSuffix,
      showErrorUi: true,
    });
    return reply;
  }

  assert.ok(process.env["PASSKEYS_RP_ID"]);
  assert.ok(process.env["PASSKEYS_EXPECTED_ORIGIN"]);
  assert.ok(reply.journeyStates?.["passkey-create"]);

  const registrationOptions =
    reply.journeyStates["passkey-create"].getSnapshot().context
      .registrationOptions;
  assert.ok(registrationOptions);

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

    await render(request, reply, {
      stringsSuffix,
      showErrorUi: true,
    });
    return reply;
  }

  if (!verification.verified) {
    request.log.warn("Register passkey - verification failed");
    addErrorMetric("VerificationFailed");

    await render(request, reply, {
      stringsSuffix,
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

  // this is necessary to prevent a user from registering more passkeys than the maximum allowed, as there is no limit on the client side and a user could bypass it by sending requests directly to the API
  const getPasskeysResult = await accountDataApiClient.getPasskeys(
    request.session.claims.public_sub
  );

  if(!getPasskeysResult.success) {
    throw new Error(getPasskeysResult.error);
  }

  const appConfig = await getAppConfig();

  if (getPasskeysResult.result.passkeys.length >= appConfig.max_number_of_passkeys) {
    request.log.warn("Register passkey - user has maximum number of passkeys");
    metrics.addMetric("UserHasMaximumNumberOfPasskeys", MetricUnit.Count, 1);

    await render(request, reply, {
      stringsSuffix,
      showErrorUi: true,
    });

    return reply;
    
  }
  // end of check for maximum number of passkeys

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
    },
  );

  if (!savePasskeyResult.success) {
    throw new Error(savePasskeyResult.error);
  }

  const passkeyConvenienceMetadata =
    await getPasskeyConvenienceMetadataByAaguid(
      verification.registrationInfo.aaguid,
    );

  await sendNotification(
    passkeyConvenienceMetadata
      ? {
          notificationType: NotificationType.CREATE_PASSKEY_WITH_PASSKEY_NAME,
          emailAddress: request.session.claims.email,
          passkeyName: passkeyConvenienceMetadata.name,
        }
      : {
          notificationType:
            NotificationType.CREATE_PASSKEY_WITHOUT_PASSKEY_NAME,
          emailAddress: request.session.claims.email,
        },
  );

  return await completeJourney(
    request,
    reply,
    {
      aaguid: verification.registrationInfo.aaguid,
    },
    true,
  );
}
