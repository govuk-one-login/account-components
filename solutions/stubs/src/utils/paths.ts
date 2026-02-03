export const paths = {
  requestObjectGenerator: "/generate-request-object",
  requestObjectCreator: "/",
  clientJwks: "/:client/.well-known/jwks.json",
  clientCallback: "/:client/callback",
  accountManagementApi: {
    authenticate: "/account-management-api/authenticate",
    deleteAccount: "/account-management-api/delete-account",
    sendOtpChallenge:
      "/account-management-api/send-otp-challenge/:publicSubjectId",
    verifyOtpChallenge:
      "/account-management-api/verify-otp-challenge/:publicSubjectId",
  },
  accountDataApi: {},
  passKeys: {
    user: "/account-management-data-api/accounts/:accountId/authenticators/passkeys",
    resource:
      "/account-management-data-api/accounts/:accountId/authenticators/passkeys/:passkeyId",
  },
} as const;
