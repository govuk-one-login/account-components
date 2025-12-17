import { AppConfigDataClient } from "@aws-sdk/client-appconfigdata";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import { tracer } from "../tracer.js";

const createAppConfigClient = () => {
  const appconfigClient = new AppConfigDataClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? appconfigClient
      : tracer.captureAWSv3Client(appconfigClient);

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
