import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import {
  generateRegistrationOptions,
  MetadataService,
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
import { getEnvironment } from "../../../../../commons/utils/getEnvironment/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

await MetadataService.initialize({
  verificationMode: ["local", "dev", "build"].includes(getEnvironment())
    ? "permissive" // Required during integration tests because the emulated authenticator will send aaguids not recognised by the metadata service
    : "strict",
  // TODO if we are using our own metadata service then change the config here appropriately
});

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

  const backLink =
    !reply.client?.consider_user_logged_in && !options?.showErrorUi
      ? process.env["AUTH_CREATE_PASSKEY_URL"]
      : undefined;

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
    backLink,
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
    metrics.addMetric("InvalidRequestBody", MetricUnit.Count, 1);

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
    metrics.addMetric("ClientError", MetricUnit.Count, 1);

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
    metrics.addMetric("VerificationError", MetricUnit.Count, 1);

    await render(request, reply, {
      stringsSuffix,
      showErrorUi: true,
    });
    return reply;
  }

  if (!verification.verified) {
    request.log.warn("Register passkey - verification failed");
    metrics.addMetric("VerificationFailed", MetricUnit.Count, 1);

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
    },
  );

  if (!savePasskeyResult.success) {
    throw new Error(savePasskeyResult.error);
  }

  return await completeJourney(request, reply, {}, true);
}
