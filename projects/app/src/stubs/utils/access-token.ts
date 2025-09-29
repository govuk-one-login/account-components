import { v4 as uuid } from "uuid";
import {
    importJWK,
    JWK,
    JWTHeaderParameters,
    JWTPayload,
    KeyLike,
    SignJWT,
} from "jose";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Token } from "../common/models";
import {
    validateClientIdMatches,
    validateRedirectURLSupported,
    validateSupportedGrantType,
    verifyParametersExistAndOnlyOnce,
} from "./validate-token";

export interface Response {
    statusCode: number;
    body: string;
}

interface OicdPersistedData {
    code: string;
    nonce: string;
}

const dynamoClient = new DynamoDBClient({});
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        convertClassInstanceToMap: true,
    },
});
const { OIDC_CLIENT_ID, ENVIRONMENT, JWK_KEY_SECRET } = process.env;
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
    oidcClientId: string,
    environment: string,
    randomString: string,
    nonce: string
): JWTPayload => ({
    sub: `urn:fdc:gov.uk:2022:${randomString}`,
    iss: `https://oidc-stub.home.${environment}.account.gov.uk/`,
    aud: oidcClientId,
    exp: epochDateNow() + 3600,
    iat: epochDateNow(),
    sid: uuid(),
    nonce,
    vot: "Cl.Cm",
});

export const generateAccessToken = async (nonce: string): Promise<string> => {
    const privateKey = await getPrivateKey(); // Retrieve cached private key
    const jwt = await new SignJWT(
        newClaims(OIDC_CLIENT_ID, ENVIRONMENT, uuid(), nonce)
    ).setProtectedHeader(jwtHeader).sign(privateKey);

    const tokenResponse: Token = {
        ...tokenResponseTemplate,
        access_token: jwt,
        id_token: jwt,
    };

    return JSON.stringify(tokenResponse);
};
