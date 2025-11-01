import assert from "node:assert";
import { createDecipheriv } from "node:crypto";
import * as v from "valibot";
import { getKmsClient } from "../../../../../commons/utils/awsClient/index.js";
import { logger } from "../../../../../commons/utils/logger/index.js";
import { metrics } from "../../../../../commons/utils/metrics/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import {
  authorizeErrors,
  ErrorResponse,
  getRedirectToClientRedirectUriResponse,
} from "./common.js";
import {
  jarContentEncryptionAlgorithm,
  jarKeyEncryptionAlgorithm,
} from "../../../../../commons/utils/contstants.js";
import { EncryptionAlgorithmSpec } from "@aws-sdk/client-kms";

export const decryptJar = async (
  jar: string,
  clientId: string,
  redirectUri: string,
  state?: string,
) => {
  try {
    metrics.addDimensions({ client_id: clientId });

    const jarComponents = v.parse(
      v.message(
        v.tuple([v.string(), v.string(), v.string(), v.string(), v.string()]),
        "JAR is not of the expected format",
      ),
      jar.split("."),
    );

    const [protectedHeader, encryptedKey, iv, ciphertext, tag] = jarComponents;

    const headerComponents = v.parse(
      v.message(
        v.pipe(
          v.object({
            alg: v.literal(jarKeyEncryptionAlgorithm),
            enc: v.literal(jarContentEncryptionAlgorithm),
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

    assert.ok(
      process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
      "JAR_RSA_ENCRYPTION_KEY_ALIAS is not set",
    );

    try {
      const kmsResult = await (
        await getKmsClient()
      ).decrypt({
        KeyId: process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
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
      logger.warn("Failed to decrypt JAR", {
        clientId,
        error,
      });
      metrics.addMetric("JARDecryptFailed", MetricUnit.Count, 1);
      return new ErrorResponse(
        getRedirectToClientRedirectUriResponse(
          redirectUri,
          authorizeErrors.invalidRequest,
          state,
        ),
      );
    }
  } catch (error) {
    logger.error("Invalid Configuration - Unable to decrypt JAR", {
      clientId,
      error,
    });
    return new ErrorResponse(
      getRedirectToClientRedirectUriResponse(
        redirectUri,
        authorizeErrors.serverError,
        state,
      ),
    );
  }
};
