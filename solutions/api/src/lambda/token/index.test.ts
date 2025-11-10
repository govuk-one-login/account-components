import { describe, it, expect } from "vitest";
import { handler } from "./index.js";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";

const mockContext = {} as unknown as Context;

describe("token handler", () => {
  it("returns 200 status with hello world body", async () => {
    const result = await handler(
      {
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: "some_code",
          redirect_uri: "https://example.com/callback",
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: "some_client_assertion",
        }),
      } as APIGatewayProxyEvent,
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 200,
      body: '"hello world"',
    });
  });

  it("returns 400 status with invalid_request error for invalid request", async () => {
    const result = await handler(
      {
        body: JSON.stringify({
          grant_type: "invalid_grant",
          code: "",
          redirect_uri: "",
          client_assertion_type: "invalid_type",
          client_assertion: "",
        }),
      } as APIGatewayProxyEvent,
      mockContext,
    );

    expect(result).toStrictEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4001",
      }),
    });
  });
});
