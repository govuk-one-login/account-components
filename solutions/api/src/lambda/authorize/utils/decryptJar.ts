import assert from "node:assert";
import { createDecipheriv } from "node:crypto";
import * as v from "valibot";
import { getKmsClient } from "../../../../../commons/utils/awsClient/kmsClient/index.js";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import {
  jarContentEncryptionAlgorithm,
  jarKeyEncryptionAlgorithm,
} from "../../../../../commons/utils/constants.js";
import { EncryptionAlgorithmSpec } from "@aws-sdk/client-kms";
import { authorizeErrors } from "../../../../../commons/utils/authorize/authorizeErrors.js";

let keyId: string | undefined = undefined;

const getKeyId = async (): Promise<string> => {
  if (keyId) return keyId;
  assert.ok(
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
    "JAR_RSA_ENCRYPTION_KEY_ALIAS is not set",
  );

  const kmsClient = getKmsClient();
  const result = await kmsClient.describeKey({
    KeyId: process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
  });

  assert.ok(
    result.KeyMetadata?.KeyId,
    "Failed to get keyId for JAR_RSA_ENCRYPTION_KEY_ALIAS",
  );
  keyId = result.KeyMetadata.KeyId;
  return keyId;
};

export const decryptJar = async (
  jar: string,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  try {
    const jarComponents = v.parse(
      v.message(
        v.tuple([v.string(), v.string(), v.string(), v.string(), v.string()]),
        "JAR is not of the expected format",
      ),
      jar.split("."),
    );

    const [protectedHeader, encryptedKey, iv, ciphertext, tag] = jarComponents;

    const keyId = await getKeyId();

    const headerComponents = v.parse(
      v.message(
        v.pipe(
          v.object({
            alg: v.literal(jarKeyEncryptionAlgorithm),
            enc: v.literal(jarContentEncryptionAlgorithm),
            kid: v.literal(keyId),
          }),
          v.transform((input) => ({
            ...input,
            alg: EncryptionAlgorithmSpec.RSAES_OAEP_SHA_256,
            enc: "aes-256-gcm" as const,
          })),
        ),
        "JAR header is not of the expected format",
      ),
      JSON.parse(Buffer.from(protectedHeader, "base64").toString()),
    );

    try {
      const kmsClient = getKmsClient();
      const kmsResult = await kmsClient.decrypt({
        KeyId: keyId,
        CiphertextBlob: Buffer.from(encryptedKey, "base64"),
        EncryptionAlgorithm: headerComponents.alg,
      });

      assert.ok(kmsResult.Plaintext, "Failed to decrypt CEK");

      const decipher = createDecipheriv(
        headerComponents.enc,
        kmsResult.Plaintext,
        Buffer.from(iv, "base64"),
      );
      decipher.setAAD(Buffer.from(protectedHeader, "ascii"));
      decipher.setAuthTag(Buffer.from(tag, "base64"));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64")),
        decipher.final(),
      ]);

      return decrypted.toString();
    } catch (error) {
      logger.warn("JARDecryptFailed", {
        client_id: clientId,
        error,
      });
      metrics.addMetric("JARDecryptFailed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.jarDecryptFailed,
          state,
        ),
      );
    }
  } catch (error) {
    logger.error("JARDecryptUnknownError", {
      client_id: clientId,
      error,
    });
    metrics.addMetric("JARDecryptUnknownError", MetricUnit.Count, 1);
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        redirectUri,
        authorizeErrors.jarDecryptUnknownError,
        state,
      ),
    );
  }
};
