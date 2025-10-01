import type { Algorithms, SignatureTypes } from "../types/common.js";

export type AlgType = Record<SignatureTypes, Algorithms>;

export interface JwtHeader {
  alg: Algorithms;
  typ?: string;
  kid?: string;
  [propName: string]: unknown;
}

export interface RequestBody {
  iss: string;
  client_id: string;
  client_secret: string;
  aud: string;
  response_type: string;
  redirect_uri: string;
  scope: string;
  state: string;
  jti: string;
  iat: string;
  exp: string;
  access_token?: string;
  refresh_token?: string;
  sub: string;
  email: string;
  govuk_signin_journey_id?: string;
  lng?: string;
  rp_client_id?: string;
  scenario: string;
  [key: string]: unknown;
}
