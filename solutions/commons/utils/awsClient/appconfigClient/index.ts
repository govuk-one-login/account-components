import { AppConfigDataClient } from "@aws-sdk/client-appconfigdata";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

const createAppConfigClient = () => {
  const appConfigClient = new AppConfigDataClient(getAwsClientConfig());

  const wrappedClient =
    getEnvironment() === "local"
      ? appConfigClient
      : AWSXRay.captureAWSv3Client(appConfigClient);

  return {
    client: wrappedClient,
    config: wrappedClient.config,
  };
};

export { createAppConfigClient };
