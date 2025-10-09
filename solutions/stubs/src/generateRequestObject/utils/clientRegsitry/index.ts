interface ClientRegistry {
  client_id: string;
  scope: string;
  redirect_uris: string[];
  client_name: string;
  jwks_uri: string;
}

export const CLIENT_REGISTRY: ClientRegistry[] = [
  {
    //example
    client_id: "client-123",
    scope: "read",
    redirect_uris: ["https://example.com/callback"],
    client_name: "Example Client",
    jwks_uri: "https://example.com/jwks.json",
  },
  {
    //another examples
    client_id: "client-456",
    scope: "read write",
    redirect_uris: ["https://another.com/callback"],
    client_name: "Another Client",
    jwks_uri: "https://another.com/jwks.json",
  },
];
