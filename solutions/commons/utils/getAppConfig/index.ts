import { getAppConfig as retrieveAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getEnvironment } from "../getEnvironment/index.js";
import { getAppConfigClient } from "../awsClient/appconfigClient/index.js";
import type { AppConfigSchema } from "../../../config/schema/types.js";

let config: AppConfigSchema;

// localstack does not support appconfig in free edition hence reading in config directly
if (getEnvironment() === "local") {
  config = await import("../../../config/local-config.json");
} else {
  config = await retrieveAppConfig("operational", {
    application: "account-components",
    environment: getEnvironment(),
    transform: "json",
    awsSdkV3Client: getAppConfigClient().client,
    maxAge: 300,
  });
}

export async function getAppConfig(): Promise<AppConfigSchema> {
  return config;
}
