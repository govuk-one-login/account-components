import type { Client } from "../../../../../commons/utils/getClientRegistry/index.js";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";

const invalidClient: Client = {
  client_id: "A1B2C3D4E5F6G7H8A1B2C3D4E5F6G7H8",
  scope: "account-delete",
  redirect_uris: ["https://nowhere"],
  client_name: "Invalid",
  jwks_uri: "https://nowhere/.well-known/jwks.json",
};

export async function getClientRegistryWithInvalidClient(): Promise<Client[]> {
  return [...(await getClientRegistry()), invalidClient];
}
