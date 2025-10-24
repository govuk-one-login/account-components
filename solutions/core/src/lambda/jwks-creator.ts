import { Logger } from "@aws-lambda-powertools/logger";
import { exportJWK, importSPKI } from "jose";
import type { JWK } from "jose";
import assert from "node:assert";
import {
  getKmsClient,
  getS3Client,
} from "../../../commons/utils/awsClient/index.js";
import type { createKmsClient } from "../../../commons/utils/awsClient/kmsClient/index.js";
import type { createS3Client } from "../../../commons/utils/awsClient/s3Client/index.js";
import { createPublicKey } from "node:crypto";
const logger = new Logger();

export const handler = async (): Promise<void> => {
  const keyId = process.env["KMS_KEY_ID"];
  const bucketName = process.env["BUCKET_NAME"];
  const algorithm = "RSA-OAEP-256";

  const s3 = getS3Client();
  const kms = getKmsClient();
  if (!keyId) {
    throw new Error("KMS_KEY_ID environment variable is not set");
  }
  assert.ok(process.env["BUCKET_NAME"]);
  const jwks = await generateJwksFromKmsPublicKey(kms, keyId, algorithm, "enc");

  //write to s3
  await putContentToS3(s3, bucketName, "jwks.json", JSON.stringify(jwks));
};

async function generateJwksFromKmsPublicKey(
  client: ReturnType<typeof createKmsClient>,
  keyId: string,
  algorithm: string,
  use = "enc",
): Promise<{ keys: JWK[] }> {
  try {
    const publicKey = await client.getPublicKey({
      KeyId: keyId,
    });

    if (!publicKey.PublicKey) {
      throw new Error(`Public key not found for KMS key ID: ${keyId}`);
    }

    const pem = createPublicKey({
      key: Buffer.from(publicKey.PublicKey),
      format: "der",
      type: "spki",
    })
      .export({ format: "pem", type: "spki" })
      .toString();
    const cryptoKey = await importSPKI(pem, algorithm);
    const jwk = await exportJWK(cryptoKey);
    jwk.kid = keyId;
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

    return {
      keys: [jwk],
    };
  } catch (error) {
    logger.error("Error generating JWKS from KMS public key:", error as Error);
    throw error;
  }
}

export async function putContentToS3(
  s3: ReturnType<typeof createS3Client>,
  bucketName: string | undefined,
  key: string,
  content: string,
) {
  try {
    const response = await s3.putObject({
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
