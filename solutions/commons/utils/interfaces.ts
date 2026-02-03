import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export enum Scope {
  testingJourney = "testing-journey",
  accountDelete = "account-delete",
}

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
