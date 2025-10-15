import { Logger } from "@aws-lambda-powertools/logger";
import { exportJWK, importSPKI } from "jose";
import type { JWK } from "jose";
import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const logger = new Logger();

export const handler = async (): Promise<void> => {
  const keyId = process.env["KMS_KEY_ID"];
  const region = process.env["AWS_REGION"] ?? "eu-west-2";
  const bucketName = process.env["BUCKET_NAME"] ?? "components-core-jwks-store";
  const algorithm = process.env["ALGORITHM"] ?? "RSA-OAEP-256";

  const s3 = new S3Client({ region: region });
  const kms = new KMSClient({ region: region });

  if (!keyId) {
    throw new Error("KMS_KEY_ID environment variable is not set");
  }

  const jwks = await generateJwksFromKmsPublicKey(kms, keyId, algorithm, "enc");

  //write to s3
  await putContentToS3(s3, bucketName, "jwks.json", JSON.stringify(jwks));
};

function toPem(buffer: Uint8Array): string {
  const b64 = Buffer.from(buffer).toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

async function generateJwksFromKmsPublicKey(
  client: KMSClient,
  keyId: string,
  algorithm = "RSA-OAEP-256",
  use = "enc",
): Promise<{ keys: JWK[] }> {
  try {
    const { PublicKey } = await client.send(
      new GetPublicKeyCommand({ KeyId: keyId }),
    );

    if (!PublicKey) {
      throw new Error(`Public key not found for KMS key ID: ${keyId}`);
    }

    const pem = toPem(PublicKey);

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
  s3: S3Client,
  bucketName: string,
  key: string,
  content: string,
) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: "application/json",
    });

    const response = await s3.send(command);
    logger.info("Uploaded successfully:", { bucketName, key });
    return response;
  } catch (err) {
    logger.error("Failed to upload to S3:", err as Error);
    throw err;
  }
}
