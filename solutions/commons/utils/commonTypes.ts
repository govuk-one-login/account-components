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
