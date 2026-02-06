import { describe, it, expect } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { getTxmaAuditEncodedFromAPIGatewayEvent } from "./index.js";

describe("getTxmaAuditEncodedFromAPIGatewayEvent", () => {
  it("returns undefined when event is undefined", () => {
    const result = getTxmaAuditEncodedFromAPIGatewayEvent();

    expect(result).toBeUndefined();
  });

  it("returns undefined when txma-audit-encoded header is not present", () => {
    const event = {
      headers: {
        "other-header": "value",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getTxmaAuditEncodedFromAPIGatewayEvent(event);

    expect(result).toBeUndefined();
  });

  it("returns the txma-audit-encoded header value when present", () => {
    const event = {
      headers: {
        "txma-audit-encoded": "encoded-audit-data",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getTxmaAuditEncodedFromAPIGatewayEvent(event);

    expect(result).toBe("encoded-audit-data");
  });

  it("returns the txma-audit-encoded header value when other headers are also present", () => {
    const event = {
      headers: {
        "other-header": "other-value",
        "txma-audit-encoded": "audit-123",
        "another-header": "another-value",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getTxmaAuditEncodedFromAPIGatewayEvent(event);

    expect(result).toBe("audit-123");
  });
});
