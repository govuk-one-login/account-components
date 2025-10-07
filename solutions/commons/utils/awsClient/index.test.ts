import { describe, it, expect } from "vitest";
import { getDynamoDbClient, getSqsClient } from "./index.js";

describe("awsClient", () => {
  it("should return a DynamoDB client", () => {
    const client = getDynamoDbClient();

    expect(client).toBeDefined();
  });

  it("should return a SQS client", () => {
    const client = getSqsClient();

    expect(client).toBeDefined();
  });

  it("should return the same dynamodb client instance on subsequent calls", () => {
    const client1 = getDynamoDbClient();
    const client2 = getDynamoDbClient();

    expect(client1).toBe(client2);
  });

  it("should return the same sqs client instance on subsequent calls", () => {
    const client1 = getSqsClient();
    const client2 = getSqsClient();

    expect(client1).toBe(client2);
  });
});
