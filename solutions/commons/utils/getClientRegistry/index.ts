import { getAppConfig } from "../getAppConfig/index.js";

export async function getClientRegistry() {
  return (await getAppConfig()).client_registry;
}
