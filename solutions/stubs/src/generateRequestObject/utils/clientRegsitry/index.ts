interface ClientRegistry {
  client_id: string;
  scope: string;
  redirect_uris: string[];
  client_name: string;
  jwks_uri: string;
}

export const CLIENT_REGISTRY: ClientRegistry[] = [
  {
    client_id: "123456789",
    scope: "am-account-delete",
    redirect_uris: ["https://signin.account.gov.uk/acm-callback"],
    client_name: "Dummy Auth",
    jwks_uri: "https://signin.account.gov.uk/.well-known/jwks.json",
  },
  {
    client_id: "234567890",
    scope: "am-account-delete",
    redirect_uris: ["https://home.account.gov.uk/acm-callback"],
    client_name: "Dummy Home",
    jwks_uri: "https://home.account.gov.uk/.well-known/jwks.json",
  },
];
