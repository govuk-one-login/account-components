import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export enum Scope {
  testingJourney = "testing-journey",
  accountDelete = "account-delete",
  passkeyCreate = "passkey-create",
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

/**
 * Omits keys O from the nested object at the given dot-separated Path in T,
 * preserving all other properties at every level.
 */
export type OmitFromNested<
  T,
  Path extends string,
  O extends string,
> = Path extends `${infer K}.${infer Rest}`
  ? T extends Partial<Record<K, infer U>>
    ? Partial<Record<K, OmitFromNested<NonNullable<U>, Rest, O>>>
    : unknown
  : T extends Partial<Record<Path, infer U>>
    ? Partial<Record<Path, Omit<NonNullable<U>, O>>>
    : unknown;
