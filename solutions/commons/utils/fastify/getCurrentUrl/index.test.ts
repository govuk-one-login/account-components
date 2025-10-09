import { describe, it, expect } from "vitest";
import { getCurrentUrl } from "./index.js";
import type { FastifyRequest } from "fastify";

describe("getCurrentUrl", () => {
  it("should return the full URL for an HTTP request", () => {
    const mockRequest = {
      protocol: "http",
      host: "localhost:3000",
      originalUrl: "/test/path?foo=bar",
    } as FastifyRequest;
    const result = getCurrentUrl(mockRequest);

    expect(result.href).toBe("http://localhost:3000/test/path?foo=bar");
  });

  it("should return the full URL for an HTTPS request", () => {
    const mockRequest = {
      protocol: "https",
      host: "example.com",
      originalUrl: "/secure",
    } as FastifyRequest;
    const result = getCurrentUrl(mockRequest);

    expect(result.href).toBe("https://example.com/secure");
  });

  it("should handle requests with no query string", () => {
    const mockRequest = {
      protocol: "http",
      host: "localhost",
      originalUrl: "/plain",
    } as FastifyRequest;
    const result = getCurrentUrl(mockRequest);

    expect(result.href).toBe("http://localhost/plain");
  });

  it("should handle requests with a port in the host header", () => {
    const mockRequest = {
      protocol: "http",
      host: "localhost:8080",
      originalUrl: "/with-port",
    } as FastifyRequest;
    const result = getCurrentUrl(mockRequest);

    expect(result.href).toBe("http://localhost:8080/with-port");
  });
});
