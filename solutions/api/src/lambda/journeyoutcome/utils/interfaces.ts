import type { JWTPayload } from "jose";
import type { Scope } from "../../../../../commons/utils/authorize/getClaimsSchema.js";

export interface JourneyOutcomePayload extends JWTPayload {
  outcome_id?: string;
}

export interface JourneyOutcome {
  sub: string;
  email: string;
  outcome: {
    scope: Scope;
    timestamp: number;
    [key: string]: unknown;
  }[];
}
