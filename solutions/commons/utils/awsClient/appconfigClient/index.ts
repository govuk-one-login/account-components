import { AppConfigDataClient } from "@aws-sdk/client-appconfigdata";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createAppConfigClient = () => {
  const appconfigClient = new AppConfigDataClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? appconfigClient
      : AWSXRay.captureAWSv3Client(appconfigClient);

  return {
    client: wrappedClient,
    config: wrappedClient.config,
  };
};

let cachedAppConfigClient: ReturnType<typeof createAppConfigClient> | undefined;
const getAppConfigClient = (): ReturnType<typeof createAppConfigClient> => {
  cachedAppConfigClient ??= createAppConfigClient();
  return cachedAppConfigClient;
};

export { getAppConfigClient };
