import { createRequire } from "node:module";
// import { createAppConfigClient } from "../../../../../commons/utils/awsClient/appconfigClient/index.js";
import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getEnvironment } from "../../../../../commons/utils/getEnvironment/index.js";

const require = createRequire(import.meta.url);

interface ClientRegistry {
  client_id: string;
  scope: string;
  redirect_uris: string[];
  client_name: string;
  jwks_uri: string;
}

function addNonExistentClient(clientRegistry: ClientRegistry[]) {
  clientRegistry.push({
    client_id: "A1B2C3D4E5F6G7H8I9J0A1B2C3D4E5F6G7H8I9J0",
    scope: "am-account-delete",
    redirect_uris: ["https://nowhere"],
    client_name: "An Invalid Client",
    jwks_uri: "https://nowhere/.well-known/jwks.json",
  });
  return clientRegistry;
}

export async function getClientRegistry(): Promise<ClientRegistry[]> {
  let client_registry: ClientRegistry[] = [];
  let config: unknown;

  if (getEnvironment() === "local") {
    config = require("../../config/local-config.json");
  } else {
    config = await getAppConfig("operational", {
      application: "account-components",
      environment: process.env["ENVIRONMENT"] ?? "dev",
      transform: "json",
      // awsSdkV3Client: createAppConfigClient()
    });
  }
  if (
    config !== null &&
    typeof config === "object" &&
    "client_registry" in config
  ) {
    client_registry = config.client_registry as ClientRegistry[];
  }
  return addNonExistentClient(client_registry);
}
