import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import type { JWTPayload } from "jose";

export type APIGatewayProxyHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

export interface JourneyOutcomePayload extends JWTPayload {
  outcome_id?: string;
}

export type JourneyOutcome = object[];
