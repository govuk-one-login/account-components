import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import type { Scope } from "./authorize/getClaimsSchema.js";

export type APIGatewayProxyHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

export interface JourneyOutcome {
  outcome_id: string;
  sub: string;
  email: string;
  scope: Scope;
  success: boolean;
  journeys: {
    journey: Scope;
    timestamp: number;
    success: boolean;
    details: Record<string, unknown>;
  }[];
}
