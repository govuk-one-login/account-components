import { describe, expect, it, vi } from "vitest";
import type { Context } from "aws-lambda";

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "test-function",
  functionVersion: "1",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-1:123456789012:function:test-function",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/test-function",
  logStreamName: "2023/01/01/[$LATEST]test-stream",
  getRemainingTimeInMillis: () => 30000,
  done: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn(),
};

describe("jwks-creator", () => {
  describe("handler", () => {
    it("should throw error when BUCKET_NAME is not set", async () => {
      const originalEnv = process.env;
      process.env = { STACK_NAME: "test-stack" };

      try {
        const { handler } = await import("./jwks-creator.js");
        await expect(handler({}, mockContext)).rejects.toThrow(
          "BUCKET_NAME not set",
        );
      } finally {
        process.env = originalEnv;
      }
    });

    it("should throw error when STACK_NAME is not set", async () => {
      const originalEnv = process.env;
      process.env = { BUCKET_NAME: "test-bucket" };

      try {
        const { handler } = await import("./jwks-creator.js");
        await expect(handler({}, mockContext)).rejects.toThrow(
          "STACK_NAME not set",
        );
      } finally {
        process.env = originalEnv;
      }
    });
  });
});
