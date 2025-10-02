import { SignatureTypes } from "../types/common.js";

export const AUTHENTICATION_ISSUER = "authentication-issuer";

export const getPrivateKeyName = (keyType: SignatureTypes): string => {
  const keyEnvironment =
    keyType == SignatureTypes.EC
      ? "EC_PRIVATE_KEY_SSM_NAME"
      : "RSA_PRIVATE_KEY_SSM_NAME";

  const privateKey = process.env[keyEnvironment];
  if (!privateKey) {
    throw new Error(`Environment variable ${keyEnvironment} is not set`);
  }
  return privateKey;
};

export const getPublicKeyName = (keyType: SignatureTypes): string => {
  const keyEnvironment =
    keyType == SignatureTypes.EC
      ? "EC_PUBLIC_KEY_SSM_NAME"
      : "RSA_PUBLIC_KEY_SSM_NAME";

  const publicKey = process.env[keyEnvironment];
  if (!publicKey) {
    throw new Error(`Environment variable ${keyEnvironment} is not set`);
  }
  return publicKey;
};

export const getDefaultKeyValue = () => {
  return process.env["DEFAULT_SSM_VALUE"];
};

export const getPercentageReturn4xx = () => {
  return getPositiveNumber("Percentage", "PERCENTAGE_RETURN_4XX", 1);
};

export const getPercentageReturn5xx = () => {
  return getPositiveNumber("Percentage", "PERCENTAGE_RETURN_5XX", 1);
};

export const getPercentageTimeout = () => {
  return getPositiveNumber("Percentage", "PERCENTAGE_TIMEOUT", 1);
};

export const getPercentageDelay = () => {
  return getPositiveNumber("Percentage", "PERCENTAGE_DELAY", 1);
};

export const getMaximumDelayMilliseconds = () => {
  return getPositiveNumber("Maximum delay", "MAXIMUM_DELAY_MILLISECONDS");
};

/**
 * A function for getting the positive numbers.
 *
 * @param numberLabel - the number.
 * @param environmentVariable - the environment variable.
 * @param upperLimit - the limit.
 * @returns A positive number.
 */

function getPositiveNumber(
  numberLabel: string,
  environmentVariable: string,
  upperLimit?: number,
) {
  const number = +(process.env[environmentVariable] ?? 0);
  if (Number.isNaN(number)) {
    throw new TypeError(`${numberLabel} value must be a number.`);
  }
  if (number < 0 || (upperLimit && number > upperLimit)) {
    const message = upperLimit
      ? `${numberLabel} value must be between 0.00 and ${upperLimit.toFixed(2)}.`
      : `${numberLabel} cannot be a negative number.`;
    throw new Error(message);
  }
  return number;
}
