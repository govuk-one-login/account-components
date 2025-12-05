import type { JWTPayload } from "jose";

export interface JourneyOutcomePayload extends JWTPayload {
  outcome_id?: string;
}
