import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";
import { getAwsClientConfig } from "../getAwsClientConfig/index.js";
import { getEnvironment } from "../../getEnvironment/index.js";
import * as AWSXRay from "aws-xray-sdk";

let cachedParametersProvider: SSMProvider | undefined;
const getParametersProvider = (): SSMProvider => {
  cachedParametersProvider ??= new SSMProvider({
    clientConfig: getAwsClientConfig(),
  });

  cachedParametersProvider.client =
    getEnvironment() === "local"
      ? cachedParametersProvider.client
      : AWSXRay.captureAWSv3Client(cachedParametersProvider.client);

  return cachedParametersProvider;
};

export { getParametersProvider };
