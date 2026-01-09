import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import type {
  AppConfigSchema,
  ClientEntry,
} from "../../../../../config/schema/types.js";

const invalidClient: ClientEntry = {
  client_id: "A1B2C3D4E5F6G7H8A1B2C3D4E5F6G7H8",
  scope: "account-delete",
  redirect_uris: ["https://nowhere"],
  client_name: "Invalid",
  jwks_uri: "https://nowhere/.well-known/jwks.json",
  consider_user_logged_in: false,
};

export async function getClientRegistryWithInvalidClient(): Promise<
  AppConfigSchema["client_registry"]
> {
  return [...(await getClientRegistry()), invalidClient];
}
