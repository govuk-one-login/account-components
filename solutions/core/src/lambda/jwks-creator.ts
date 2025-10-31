import { Logger } from "@aws-lambda-powertools/logger";
import { exportJWK, importSPKI } from "jose";
import type { JWK } from "jose";
import type { Context } from "aws-lambda";
import { createPublicKey } from "node:crypto";
import assert from "node:assert";
import {
  getS3Client,
  getKmsClient,
} from "../../../commons/utils/awsClient/index.js";
import { jarEncryptionKeyAlgorithm } from "../../../commons/utils/contstants.js";

const logger = new Logger();

export const handler = async (
  _event: unknown,
  context: Context,
): Promise<void> => {
  logger.addContext(context);
  assert.ok(
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
    "JAR_RSA_ENCRYPTION_KEY_ALIAS not set",
  );

  const jwks = await generateJwksFromKmsPublicKey(
    process.env["JAR_RSA_ENCRYPTION_KEY_ALIAS"],
  );

  await putContentToS3(JSON.stringify(jwks));
};

async function generateJwksFromKmsPublicKey(
  keyAlias: string,
): Promise<{ keys: JWK[] }> {
  try {
    logger.info("Getting Public Key using Alias: " + keyAlias);

    const kmsClient = await getKmsClient();

    const { PublicKey } = await kmsClient.getPublicKey({
      KeyId: keyAlias,
    });

    if (!PublicKey) {
      throw new Error(`Public key not found for KMS Key Alias: ${keyAlias}`);
    }

    logger.info("Public key material", { PublicKey });

    const { KeyMetadata } = await kmsClient.describeKey({
      KeyId: keyAlias,
    });

    if (!KeyMetadata) {
      throw new Error(`Key ID not found for KMS Key Alias: ${keyAlias}`);
    }

    logger.info("Key Metadata", { KeyMetadata });

    const pem = createPublicKey({
      key: Buffer.from(PublicKey),
      format: "der",
      type: "spki",
    })
      .export({
        format: "pem",
        type: "spki",
      })
      .toString();

    logger.info("Created PEM", { pem });

    const cryptoKey = await importSPKI(pem, jarEncryptionKeyAlgorithm);
    const jwk = await exportJWK(cryptoKey);
    jwk.kid = KeyMetadata.KeyId ?? "unknown";
    jwk.alg = jarEncryptionKeyAlgorithm;
    jwk.use = "enc";

    if (!jwk.kty) {
      logger.warn("Expected 'kty' to be defined but it was missing.");
      jwk.kty = "RSA";
    } else if (jwk.kty !== "RSA") {
      logger.warn(
        `Expected kty 'RSA' but got '${jwk.kty}'. This might indicate an issue with the key type or import.`,
      );
      jwk.kty = "RSA";
    }

    logger.info("JWK", { jwk });

    return {
      keys: [jwk],
    };
  } catch (error) {
    logger.error("Error generating JWKS from KMS public key:", error as Error);
    throw error;
  }
}

export async function putContentToS3(content: string) {
  assert.ok(process.env["BUCKET_NAME"], "BUCKET_NAME not set");

  const key = "jwks.json";

  try {
    const response = await (
      await getS3Client()
    ).putObject({
      Bucket: process.env["BUCKET_NAME"],
      Key: key,
      Body: content,
      ContentType: "application/json",
    });
    logger.info("Uploaded successfully:", {
      bucketName: process.env["BUCKET_NAME"],
      key,
    });
    return response;
  } catch (err) {
    logger.error("Failed to upload to S3:", err as Error);
    throw err;
  }
}
