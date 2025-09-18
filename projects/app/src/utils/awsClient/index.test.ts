import { describe, it, expect } from "vitest";
import { getDynamoDbClient } from "./index.js";

describe("awsClient index", () => {
  it("should return a DynamoDB client", () => {
    const client = getDynamoDbClient();

    expect(client).toBeDefined();
  });

  it("should return the same client instance on subsequent calls", () => {
    const client1 = getDynamoDbClient();
    const client2 = getDynamoDbClient();

    expect(client1).toBe(client2);
  });
});
