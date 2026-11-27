import { SSMClient } from "@aws-sdk/client-ssm";
import { getAwsClientConfig } from "./getAwsClientConfig.js";

let cachedSsmClient: SSMClient | undefined;

export const getSsmClient = (): SSMClient => {
  cachedSsmClient ??= new SSMClient(getAwsClientConfig());
  return cachedSsmClient;
};
