import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getEnvironment } from "../getEnvironment/index.js";
import { getAppConfigClient } from "../awsClient/index.js";

export interface Client {
  client_id: string;
  scope: string;
  redirect_uris: string[];
  client_name: string;
  jwks_uri: string;
}

export async function getClientRegistry(): Promise<Client[]> {
  let clientRegistry: Client[] = [];
  let config: unknown;

  // localstack does not support appconfig in free edition hence reading in config directly
  if (getEnvironment() === "local") {
    config = (await import("../../../config/local-config.js")).default;
  } else {
    config = await getAppConfig("operational", {
      application: "account-components",
      environment: getEnvironment(),
      transform: "json",
      awsSdkV3Client: await getAppConfigClient(),
    });
  }
  if (
    config !== null &&
    typeof config === "object" &&
    "client_registry" in config
  ) {
    clientRegistry = config.client_registry as Client[];
  }
  return clientRegistry;
}
