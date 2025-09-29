import { v4 as uuid } from "uuid";
import {
    importJWK,
    JWK,
    JWTHeaderParameters,
    JWTPayload,
    KeyLike,
    SignJWT,
} from "jose";
import { Token } from "../types/token.js";
import {RequestBody} from "../types/token.js";

export interface Response {
    statusCode: number;
    body: string;
}

interface OicdPersistedData {
    code: string;
    nonce: string;
}

const JWK_KEY_SECRET='"{\"kty\":\"EC\",\"d\":\"Ob4_qMu1nkkBLEw97u--PHVsShP3xOKOJ6z0WsdU0Xw\",\"use\":\"sig\",\"crv\":\"P-256\",\"kid\":\"B-QMUxdJOJ8ubkmArc4i1SGmfZnNNlM-va9h0HJ0jCo\",\"x\":\"YrTTzbuUwQhWyaj11w33k-K8bFydLfQssVqr8mx6AVE\",\"y\":\"8UQcw-6Wp0bp8iIIkRw8PW2RSSjmj1I_8euyKEDtWRk\",\"alg\":\"ES256\"}"'
const OIDC_CLIENT_ID="OIDC_CLIENT_ID"

const algorithm = "ES256";
const jwtHeader: JWTHeaderParameters = {
    kid: "B-QMUxdJOJ8ubkmArc4i1SGmfZnNNlM-va9h0HJ0jCo",
    alg: algorithm,
};
const tokenResponseTemplate: Omit<Token, "access_token" | "id_token"> = {
    refresh_token: "456DEF",
    token_type: "Bearer",
    expires_in: 3600,
};
let cachedPrivateKey: Uint8Array | KeyLike;
const getPrivateKey = async () => {
    if (!cachedPrivateKey) {
        if (typeof JWK_KEY_SECRET === "undefined") {
            throw new Error("JWK_KEY_SECRET environment variable is undefined");
        }
        const jwkSecret = JSON.parse(JWK_KEY_SECRET);
        const jwk: JWK = JSON.parse(jwkSecret);
        cachedPrivateKey = await importJWK(jwk, algorithm);
    }
    return cachedPrivateKey;
};
getPrivateKey(); //populate cache on runtime

const epochDateNow = (): number => Math.round(Date.now() / 1000);

const newClaims = (
    rpClientId: string,
    iss: string,
    randomString: string,
    nonce: string
): JWTPayload => ({
    sub: `urn:fdc:gov.uk:2022:${randomString}`,
    iss: iss,
    aud: rpClientId,
    exp: epochDateNow() + 3600,
    iat: epochDateNow(),
    sid: uuid(),
    nonce,
    vot: "Cl.Cm",
});

export const generateAccessToken = async (requestBody: RequestBody): Promise<string> => {
    const privateKey = await getPrivateKey(); // Retrieve cached private key
    const jwt = await new SignJWT(
        newClaims(requestBody.client_id, requestBody.iss, uuid(), requestBody.jti)
    ).setProtectedHeader(jwtHeader).sign(privateKey);

    const tokenResponse: Token = {
        ...tokenResponseTemplate,
        access_token: jwt,
        id_token: jwt,
    };

    return JSON.stringify(tokenResponse);
};
