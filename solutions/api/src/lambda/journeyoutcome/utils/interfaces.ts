import type { JWTPayload } from "jose";
import type { Scope } from "../../../../../commons/utils/commonTypes.js";

export interface JourneyOutcomePayload extends JWTPayload {
  outcome_id?: string;
}

export interface JourneyOutcome {
  outcome_id: string;
  sub: string;
  email: string;
  scope: Scope;
  success: boolean;
  actions: {
    action: string;
    timestamp: number;
    success: boolean;
    details: Record<string, unknown>;
  }[];
}
