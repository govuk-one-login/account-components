export const paths = {
  requestObjectGenerator: "/generate-request-object",
  requestObjectCreator: "/",
  clientJwks: "/:client/.well-known/jwks.json",
  clientCallback: "/:client/callback",
} as const;
