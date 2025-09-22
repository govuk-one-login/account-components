import type { Algorithms, SigningAlgorithms, SignatureTypes } from '../types/common.js';

export type AlgType = Record<SignatureTypes, Algorithms>;
export type SigningAlgorithmType = Record<SignatureTypes, SigningAlgorithms>;

export interface JwksKeyType {
    kty: SignatureTypes;
    alg: Algorithms;
    kid: string;
}

export interface JwtHeader {
    alg: Algorithms;
    typ?: string;
    kid?: string;
}


export interface RequestBody {
    iss: string;
    client_id: string;
    client_secret: string;
    aud: string;
    redirect_uri: string;
    scope: string;
    state: string;
    nonce: string;
    expiry: number;
    sub: string;
    email: string;
    govuk_signin_journey_id: string;
    "access-token": string;
    lng: string;
    scenario: string;
    signatureType: string;
}