//
// export function buildAuthorizeRequest(
//     relyingPartyConfig: RPConfig,
//     oidcClient: OidcClient,
//     formParameters: Record<string, string>,
//     vtr: string[],
//     scopes: string[],
//     claimsSetRequest: ClaimsSetRequest,
//     language: string,
//     prompt: string,
//     rpSid: string,
//     idToken: string,
//     maxAge: string,
//     codeChallengeMethod: CodeChallengeMethod,
//     codeVerifier: CodeVerifier,
//     loginHint: string,
//     channel: string
// ): AuthenticationRequest | undefined {
//     const requestParam = formParameters['request'] || 'query';
//
//     if (requestParam === 'object') {
//         console.info('Building authorize request with JAR');
//         return oidcClient.buildJarAuthorizeRequest(
//             relyingPartyConfig.authCallbackUrl(),
//             vtr,
//             scopes,
//             claimsSetRequest,
//             language,
//             prompt,
//             rpSid,
//             idToken,
//             maxAge,
//             codeChallengeMethod,
//             codeVerifier,
//             loginHint,
//             channel
//         );
//     }
//
//     return undefined;
// };
