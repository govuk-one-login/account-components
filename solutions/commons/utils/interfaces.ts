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

export type JourneyOutcome = {
  scope: Scope;
  sub: string;
  timestamp: number;
  [key: string]: unknown;
}[];
