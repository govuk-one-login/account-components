// eslint-disable-next-line no-restricted-exports
export default JSON.parse(`{
  "client_registry": [
    {
      "client_id": "ABCDEF12345678901234567890123456",
      "scope": "am-account-delete",
      "redirect_uris": ["http://localhost:6003/auth/callback"],
      "client_name": "Auth",
      "jwks_uri": "http://host.docker.internal:6003/auth/.well-known/jwks.json"
    },
    {
      "client_id": "23456789012345678901234567890123",
      "scope": "am-account-delete",
      "redirect_uris": ["http://localhost:6003/home/callback"],
      "client_name": "Home",
      "jwks_uri": "http://host.docker.internal:6003/home/.well-known/jwks.json"
    }
  ]
}`);
