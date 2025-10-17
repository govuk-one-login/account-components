import { KMSClient } from "@aws-sdk/client-kms";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createKmsClient = () => {
  const kmsClient = new KMSClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? kmsClient
      : AWSXRay.captureAWSv3Client(kmsClient);

  return {
    kmsClient: wrappedClient,
    config: wrappedClient.config,
    getPublicKey: async (params: { KeyId: string }) => {
      const { GetPublicKeyCommand } = await import("@aws-sdk/client-kms");
      return await wrappedClient.send(new GetPublicKeyCommand(params));
    },
  };
};

export { createKmsClient };
