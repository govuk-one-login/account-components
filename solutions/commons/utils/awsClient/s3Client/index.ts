import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createS3Client = () => {
  const s3Client = new S3Client(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? s3Client
      : AWSXRay.captureAWSv3Client(s3Client);

  return {
    client: wrappedClient,
    config: wrappedClient.config,
    putObject: async (params: PutObjectCommandInput) => {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      return await wrappedClient.send(new PutObjectCommand(params));
    },
  };
};

let cachedS3Client: ReturnType<typeof createS3Client> | undefined;
const getS3Client = (): ReturnType<typeof createS3Client> => {
  cachedS3Client ??= createS3Client();
  return cachedS3Client;
};

export { getS3Client };
