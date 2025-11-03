import { Logger } from "@aws-lambda-powertools/logger";
import { exportJWK, importSPKI } from "jose";
import type { JWK } from "jose";
import { getKmsClient } from "../../../commons/utils/awsClient/kmsClient/index.js";
import type { Context } from "aws-lambda";
import { createPublicKey } from "node:crypto";
import assert from "node:assert";
import { getS3Client } from "../../../commons/utils/awsClient/s3Client/index.js";

const logger = new Logger();

export const handler = async (
  _event: unknown,
  context: Context,
): Promise<void> => {
  logger.addContext(context);
  assert.ok(process.env["BUCKET_NAME"], "BUCKET_NAME not set");
  assert.ok(process.env["STACK_NAME"], "STACK_NAME not set");

  const bucketName = process.env["BUCKET_NAME"];
  const stackName = process.env["STACK_NAME"];
  const algorithm = process.env["ALGORITHM"] ?? "RSA-OAEP-256";
  logger.info("Properties", { bucketName, algorithm, stackName });
  logger.info("Created AWS clients");
  const jwks = await generateJwksFromKmsPublicKey(
    `alias/${stackName}-JARRSAEncryptionKey`,
    algorithm,
    "enc",
  );

  //write to s3
  await putContentToS3(bucketName, "jwks.json", JSON.stringify(jwks));
};

async function generateJwksFromKmsPublicKey(
  keyAlias: string,
  algorithm = "RSA-OAEP-256",
  use = "enc",
): Promise<{ keys: JWK[] }> {
  try {
    logger.info("Getting Public Key using Alias: " + keyAlias);

    const kmsClient = getKmsClient();

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

    const cryptoKey = await importSPKI(pem, algorithm);
    const jwk = await exportJWK(cryptoKey);
    jwk.kid = KeyMetadata.KeyId ?? "unknown";
    jwk.alg = algorithm;
    jwk.use = use;

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

export async function putContentToS3(
  bucketName: string,
  key: string,
  content: string,
) {
  try {
    const response = await getS3Client().putObject({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: "application/json",
    });
    logger.info("Uploaded successfully:", { bucketName, key });
    return response;
  } catch (err) {
    logger.error("Failed to upload to S3:", err as Error);
    throw err;
  }
}
