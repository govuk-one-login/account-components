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

await MetadataService.initialize({
  verificationMode: "permissive", // Required during integration tests because the emulated authenticator will send aaguids not recognised by the metadata service

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
      userVerification: "required",
    },
    supportedAlgorithmIDs: [
      -8, // EdDSA
      -7, // ES256
      -257, // RS256
    ],
    excludeCredentials: idsOfCredentialsToExclude.map((id) => ({
      id,
    })),
    extensions: {
      credProps: true,
    },
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

  const verification = await verifyRegistrationResponse({
    // @ts-expect-error - the library's typing is too strict. This function
    // should accept any type for `response` because it is this function
    // which does the validation.
    response: body.registrationResponse,
    expectedChallenge: registrationOptions.challenge,
    expectedOrigin: process.env["PASSKEYS_EXPECTED_ORIGIN"],
    expectedRPID: process.env["PASSKEYS_RP_ID"],
  });

  if (!verification.verified) {
    request.log.warn("Register passkey - verification failed");
    await render(request, reply, {
      stringsSuffix,
      showErrorUi: true,
    });
    return reply;
  }

  const authenticatorExtensionResultsSchema = v.optional(
    v.object({
      credProps: v.optional(
        v.object({
          rk: v.optional(v.boolean()),
        }),
      ),
    }),
  );
  const authenticatorExtensionResults = v.safeParse(
    authenticatorExtensionResultsSchema,
    verification.registrationInfo.authenticatorExtensionResults,
  );

  if (!authenticatorExtensionResults.success) {
    request.log.warn(
      { issues: authenticatorExtensionResults.issues },
      "Register passkey - invalid authenticator extension results",
    );
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
      isResidentKey:
        authenticatorExtensionResults.output?.credProps?.rk ?? true, // TODO is it the correct behaviour to default to true here?
    },
  );

  if (!savePasskeyResult.success) {
    throw new Error(savePasskeyResult.error);
  }

  return await completeJourney(request, reply, {}, true);
}
