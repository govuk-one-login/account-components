import { describe, it, expect, vi } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { normalizeAPIGatewayProxyEventHeadersHandlerWrapper } from "./index.js";

const baseEvent = {
  headers: {},
  multiValueHeaders: {},
} as APIGatewayProxyEvent;

const mockContext = {} as Context;

const mockResponse = { statusCode: 200, body: "" };

describe("normalizeAPIGatewayProxyEventHeadersHandlerWrapper", () => {
  it("lowercases header keys", async () => {
    const handler = vi.fn().mockResolvedValue(mockResponse);
    const wrapped = normalizeAPIGatewayProxyEventHeadersHandlerWrapper(handler);

    await wrapped(
      {
        ...baseEvent,
        headers: { "Content-Type": "application/json", Accept: "text/html" },
        multiValueHeaders: {
          "Content-Type": ["application/json"],
          Accept: ["text/html"],
        },
      },
      mockContext,
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "content-type": "application/json", accept: "text/html" },
        multiValueHeaders: {
          "content-type": ["application/json"],
          accept: ["text/html"],
        },
      }),
      mockContext,
    );
  });

  it("merges duplicate multi-value headers with different cases", async () => {
    const handler = vi.fn().mockResolvedValue(mockResponse);
    const wrapped = normalizeAPIGatewayProxyEventHeadersHandlerWrapper(handler);

    await wrapped(
      {
        ...baseEvent,
        multiValueHeaders: {
          Accept: ["text/html"],
          accept: ["application/json"],
        },
      },
      mockContext,
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        multiValueHeaders: { accept: ["text/html", "application/json"] },
      }),
      mockContext,
    );
  });

  it("sets multi-value header to undefined when value is undefined", async () => {
    const handler = vi.fn().mockResolvedValue(mockResponse);
    const wrapped = normalizeAPIGatewayProxyEventHeadersHandlerWrapper(handler);

    await wrapped(
      { ...baseEvent, multiValueHeaders: { Accept: undefined } },
      mockContext,
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        multiValueHeaders: { accept: undefined },
      }),
      mockContext,
    );
  });

  it("returns the handler response", async () => {
    const handler = vi.fn().mockResolvedValue(mockResponse);
    const wrapped = normalizeAPIGatewayProxyEventHeadersHandlerWrapper(handler);

    const result = await wrapped(baseEvent, mockContext);

    expect(result).toStrictEqual(mockResponse);
  });

  it("preserves other event properties", async () => {
    const handler = vi.fn().mockResolvedValue(mockResponse);
    const wrapped = normalizeAPIGatewayProxyEventHeadersHandlerWrapper(handler);

    await wrapped(
      { ...baseEvent, httpMethod: "GET", path: "/test" },
      mockContext,
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ httpMethod: "GET", path: "/test" }),
      mockContext,
    );
  });
});
