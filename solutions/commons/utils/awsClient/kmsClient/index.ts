import type {
  DecryptCommandInput,
  DescribeKeyCommandInput,
  GetPublicKeyCommandInput,
  SignCommandInput,
} from "@aws-sdk/client-kms";
import { KMSClient } from "@aws-sdk/client-kms";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import { tracer } from "../tracer.js";

const createKmsClient = () => {
  const kmsClient = new KMSClient(getAwsClientConfig(true));

  const wrappedClient =
    getEnvironment() === "local"
      ? kmsClient
      : tracer.captureAWSv3Client(kmsClient);

  return {
    client: wrappedClient,
    config: wrappedClient.config,
    getPublicKey: async (params: GetPublicKeyCommandInput) => {
      const { GetPublicKeyCommand } = await import("@aws-sdk/client-kms");
      return await wrappedClient.send(new GetPublicKeyCommand(params));
    },
    decrypt: async (params: DecryptCommandInput) => {
      const { DecryptCommand } = await import("@aws-sdk/client-kms");
      return await wrappedClient.send(new DecryptCommand(params));
    },
    describeKey: async (params: DescribeKeyCommandInput) => {
      const { DescribeKeyCommand } = await import("@aws-sdk/client-kms");
      return await wrappedClient.send(new DescribeKeyCommand(params));
    },
    sign: async (params: SignCommandInput) => {
      const { SignCommand } = await import("@aws-sdk/client-kms");
      return await wrappedClient.send(new SignCommand(params));
    },
  };
};

let cachedKmsClient: ReturnType<typeof createKmsClient> | undefined;
const getKmsClient = (): ReturnType<typeof createKmsClient> => {
  cachedKmsClient ??= createKmsClient();
  return cachedKmsClient;
};

export { getKmsClient };
