import * as v from "valibot";

export const fiveMinutesInSeconds = 300;
export const oneDayInSeconds = 86400;
export const oneYearInSeconds = 31536000;

export const jarKeyEncryptionAlgorithm = "RSA-OAEP-256";
export const jarContentEncryptionAlgorithm = "A256GCM";

export const jwtSigningAlgorithm = "ES256";

export const checkUserAgentCookieName = "amc";

export const passkeyDetailsSchema = v.object({
  credential: v.string(),
  id: v.string(),
  aaguid: v.string(),
  isAttested: v.boolean(),
  signCount: v.number(),
  transports: v.array(v.string()),
  isBackUpEligible: v.boolean(),
  isBackedUp: v.boolean(),
});
