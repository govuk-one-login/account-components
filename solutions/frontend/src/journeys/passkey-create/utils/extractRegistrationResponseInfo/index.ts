import type { AttestationFormat } from "@simplewebauthn/server/helpers";
import {
  isoBase64URL,
  decodeCredentialPublicKey,
  cose,
  decodeAttestationObject,
  parseAuthenticatorData,
  convertAAGUIDToString,
} from "@simplewebauthn/server/helpers";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { logger } from "../../../../../../commons/utils/logger/index.js";

type HyphenatedCredentialDeviceType = "single-device" | "multi-device";

interface RegistrationResponseInfo {
  credentialId: string | undefined;
  aaguid: string | undefined;
  counter: number | undefined;
  credentialBackedUp: boolean | undefined;
  userVerified: boolean | undefined;
  publicKeyAlgorithm: number | undefined;
  credentialDeviceType: HyphenatedCredentialDeviceType | undefined;
  credentialTransports: AuthenticatorTransportFuture[] | undefined;
  fmt: AttestationFormat | undefined;
}

const defaultReturnValue = {
  credentialId: undefined,
  aaguid: undefined,
  counter: undefined,
  credentialBackedUp: undefined,
  userVerified: undefined,
  publicKeyAlgorithm: undefined,
  credentialDeviceType: undefined,
  credentialTransports: undefined,
  fmt: undefined,
} as const;
/*
Unfortunately this function is required because SimpleWebAuthn does not
provide a way get registration response info without first successfully
verifying the registration. We need to know info about the registration
response before verification and so we have to parse the response ourselves
to extract it.
*/
export function extractRegistrationResponseInfo(
  registrationResponse: unknown,
): RegistrationResponseInfo {
  if (registrationResponse === undefined) {
    return defaultReturnValue;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const response = (registrationResponse as RegistrationResponseJSON)
      .response;

    const attestationObject = isoBase64URL.toBuffer(response.attestationObject);
    const decodedAttestationObject = decodeAttestationObject(attestationObject);
    const fmt = decodedAttestationObject.get("fmt");
    const authData = decodedAttestationObject.get("authData");
    const parsedAuthData = parseAuthenticatorData(authData);
    const { aaguid, credentialID, counter, flags, credentialPublicKey } =
      parsedAuthData;

    let alg: number | undefined;
    if (credentialPublicKey) {
      const decodedPublicKey = decodeCredentialPublicKey(credentialPublicKey);
      const algValue = decodedPublicKey.get(cose.COSEKEYS.alg);
      alg = typeof algValue === "number" ? algValue : undefined;
    }

    const credentialDeviceType: HyphenatedCredentialDeviceType = flags.be
      ? "multi-device"
      : "single-device";
    const credentialBackedUp = flags.bs;

    return {
      credentialId: credentialID
        ? isoBase64URL.fromBuffer(credentialID)
        : undefined,
      aaguid: aaguid ? convertAAGUIDToString(aaguid) : undefined,
      counter,
      credentialBackedUp,
      userVerified: flags.uv,
      publicKeyAlgorithm: alg,
      credentialDeviceType,
      credentialTransports: response.transports,
      fmt,
    };
  } catch (error) {
    logger.error("Error extracting passkey registration response info", {
      error,
    });
    return defaultReturnValue;
  }
}
