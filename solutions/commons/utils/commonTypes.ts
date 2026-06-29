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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;
