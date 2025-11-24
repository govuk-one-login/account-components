import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "fastify";

const mockDynamoDbClient = {
  update: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

// @ts-expect-error
vi.mock(
  import("../../../commons/utils/awsClient/dynamodbClient/index.js"),
  () => ({
    getDynamoDbClient: vi.fn(() => mockDynamoDbClient),
  }),
);

const { DynamoDbSessionStore } = await import("./dynamoDbSessionStore.js");

describe("dynamoDbSessionStore", () => {
  let store: InstanceType<typeof DynamoDbSessionStore>;
  const tableName = "test-sessions-table";

  beforeEach(() => {
    vi.clearAllMocks();
    store = new DynamoDbSessionStore(tableName);
  });

  describe("set", () => {
    it("updates session with default expiry when session.expires is undefined", async () => {
      const sessionId = "test-session-id";
      const session = { user_id: "123" } as Session;
      const callback = vi.fn();
      const mockNow = 1000000;

      vi.spyOn(Date, "now").mockReturnValue(mockNow * 1000);
      mockDynamoDbClient.update.mockResolvedValue({});

      store.set(sessionId, session, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
          UpdateExpression: "SET #session = :session, #expires = :expires",
          ExpressionAttributeNames: {
            "#session": "session",
            "#expires": "expires",
          },
          ExpressionAttributeValues: {
            ":session": JSON.stringify(session),
            ":expires": 1000300,
          },
        });
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("updates session with provided expiry when session.expires is set", async () => {
      const sessionId = "test-session-id";
      const customExpiry = 2000000;
      const session = { user_id: "123", expires: customExpiry } as Session;
      const callback = vi.fn();

      mockDynamoDbClient.update.mockResolvedValue({});

      store.set(sessionId, session, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
          UpdateExpression: "SET #session = :session, #expires = :expires",
          ExpressionAttributeNames: {
            "#session": "session",
            "#expires": "expires",
          },
          ExpressionAttributeValues: {
            ":session": JSON.stringify(session),
            ":expires": customExpiry,
          },
        });
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("calls callback with error when update fails", async () => {
      const sessionId = "test-session-id";
      const session = { user_id: "123" } as Session;
      const callback = vi.fn();
      const error = new Error("DynamoDB error");

      mockDynamoDbClient.update.mockRejectedValue(error);

      store.set(sessionId, session, callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(error);
      });
    });
  });

  describe("get", () => {
    it("returns null when session item does not exist", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();

      mockDynamoDbClient.get.mockResolvedValue({});

      store.get(sessionId, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.get).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
          ConsistentRead: true,
        });
        expect(callback).toHaveBeenCalledWith(null, null);
      });
    });

    it("destroys expired session and returns null", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();
      const mockNow = 2000000;
      const expiredTime = 1000000;

      vi.spyOn(Date, "now").mockReturnValue(mockNow * 1000);
      mockDynamoDbClient.get.mockResolvedValue({
        Item: {
          session: JSON.stringify({ userId: "123" }),
          expires: expiredTime,
        },
      });
      mockDynamoDbClient.delete.mockResolvedValue({});

      store.get(sessionId, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.delete).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
        });
        expect(callback).toHaveBeenCalledWith(null, null);
      });
    });

    it("returns error when destroy fails for expired session", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();
      const mockNow = 2000000;
      const expiredTime = 1000000;
      const error = new Error("Delete failed");

      vi.spyOn(Date, "now").mockReturnValue(mockNow * 1000);
      mockDynamoDbClient.get.mockResolvedValue({
        Item: {
          session: JSON.stringify({ userId: "123" }),
          expires: expiredTime,
        },
      });
      mockDynamoDbClient.delete.mockRejectedValue(error);

      store.get(sessionId, callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(error, null);
      });
    });

    it("returns valid session when not expired", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();
      const mockNow = 1000000;
      const futureTime = 2000000;
      const sessionData = { userId: "123" };

      vi.spyOn(Date, "now").mockReturnValue(mockNow * 1000);
      mockDynamoDbClient.get.mockResolvedValue({
        Item: {
          session: JSON.stringify(sessionData),
          expires: futureTime,
        },
      });

      store.get(sessionId, callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(null, sessionData);
      });
    });

    it("calls callback with error when get fails", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();
      const error = new Error("DynamoDB error");

      mockDynamoDbClient.get.mockRejectedValue(error);

      store.get(sessionId, callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(error, null);
      });
    });
  });

  describe("destroy", () => {
    it("deletes session successfully", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();

      mockDynamoDbClient.delete.mockResolvedValue({});

      store.destroy(sessionId, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.delete).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
        });
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("calls callback with error when delete fails", async () => {
      const sessionId = "test-session-id";
      const callback = vi.fn();
      const error = new Error("DynamoDB error");

      mockDynamoDbClient.delete.mockRejectedValue(error);

      store.destroy(sessionId, callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(error);
      });
    });
  });
});
