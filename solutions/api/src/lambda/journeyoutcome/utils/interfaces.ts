import type { JWTPayload } from "jose";
import type { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";

export interface JourneyOutcomePayload extends JWTPayload {
  outcome_id?: string;
}

export type JourneyOutcome = {
  scope: Scope;
  sub: string;
  timestamp: number;
  [key: string]: unknown;
}[];
