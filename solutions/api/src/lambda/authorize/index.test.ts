import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";

process.env["AUTHORIZE_ERROR_PAGE_URL"] = "https://example.com/error";

const getQueryParams = vi.fn();
const getClient = vi.fn();

vi.mock(import("./utils/getQueryParams.js"), () => ({
  getQueryParams,
}));

vi.mock(import("./utils/getClient.js"), () => ({
  getClient,
}));

const { handler } = await import("./index.js");
const { ErrorResponse } = await import("./utils/common.js");

describe("authorize handler", () => {
  const mockEvent = {} as APIGatewayProxyEvent;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when getQueryParams fails", async () => {
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });
    getQueryParams.mockReturnValue(errorResponse);

    const result = await handler(mockEvent);

    expect(result).toBe(errorResponse.errorResponse);
  });

  it("returns error when getClient fails", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
    };
    const errorResponse = new ErrorResponse({
      statusCode: 302,
      headers: { location: "https://example.com/error" },
      body: "",
    });

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(errorResponse);

    const result = await handler(mockEvent);

    expect(result).toBe(errorResponse.errorResponse);
    expect(getClient).toHaveBeenCalledWith("test-client", "http://test.com");
  });

  it("returns success when both functions succeed", async () => {
    const queryParams = {
      client_id: "test-client",
      redirect_uri: "http://test.com",
    };
    const client = { id: "test-client" };

    getQueryParams.mockReturnValue(queryParams);
    getClient.mockResolvedValue(client);

    const result = await handler(mockEvent);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "Authorized" }),
    });
  });
});
