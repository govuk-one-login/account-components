import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getEnvironment } from "../../../../../commons/utils/getEnvironment/index.js";
import { getAppConfigClient } from "../../../../../commons/utils/awsClient/index.js";

interface Client {
  client_id: string;
  scope: string;
  redirect_uris: string[];
  client_name: string;
  jwks_uri: string;
}

const invalidClient: Client = {
  client_id: "A1B2C3D4E5F6G7H8A1B2C3D4E5F6G7H8",
  scope: "am-account-delete",
  redirect_uris: ["https://nowhere"],
  client_name: "Invalid",
  jwks_uri: "https://nowhere/.well-known/jwks.json",
};

function addNonExistentClient(clientRegistry: Client[]) {
  if (!clientRegistry.includes(invalidClient)) {
    clientRegistry.push(invalidClient);
  }
  return clientRegistry;
}

export async function getClientRegistry(): Promise<Client[]> {
  let clientRegistry: Client[] = [];
  let config: unknown;

  // localstack does not support appconfig in free edition hence reading in config directly
  if (getEnvironment() === "local") {
    config = (await import("../../../../../config/local-config.json")).default;
  } else {
    config = await getAppConfig("operational", {
      application: "account-components",
      environment: getEnvironment(),
      transform: "json",
      awsSdkV3Client: getAppConfigClient(),
    });
  }
  if (
    config !== null &&
    typeof config === "object" &&
    "client_registry" in config
  ) {
    clientRegistry = config.client_registry as Client[];
  }
  return addNonExistentClient(clientRegistry);
}
