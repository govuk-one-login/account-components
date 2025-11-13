import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "./index.js";
import type { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy.js";
import type { Context } from "aws-lambda";
import type { JWTPayload } from "jose";

const mockContext = {} as unknown as Context;

vi.mock(import("./utils/verifyClientAssertion.js"));
const mockVerifyClientAssertion = vi.mocked(
  await import("./utils/verifyClientAssertion.js"),
).verifyClientAssertion;

describe("token handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status with hello world body", async () => {
    mockVerifyClientAssertion.mockResolvedValue({} as any as JWTPayload);
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

  it("returns 400 status if the client assertion verification fails", async () => {
    mockVerifyClientAssertion.mockRejectedValue(
      new Error("Invalid client assertion"),
    );
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
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: "E4001",
      }),
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
