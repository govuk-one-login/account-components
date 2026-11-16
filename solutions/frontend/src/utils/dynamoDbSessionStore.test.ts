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
  const mockNow = 1000000;
  const defaultExpiry = mockNow + 300;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(mockNow * 1000);
    store = new DynamoDbSessionStore(tableName);
  });

  describe("set", () => {
    it("updates session with default expiry when session.expires is undefined", async () => {
      const sessionId = "test-session-id";
      const session = {} as Session;
      const callback = vi.fn();

      mockDynamoDbClient.update.mockResolvedValue({});

      store.set(sessionId, session, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
          UpdateExpression:
            "SET #session = :session, #expires = :expires, #generation = :generation",
          ExpressionAttributeNames: {
            "#session": "session",
            "#expires": "expires",
            "#generation": "__fastifySessionMetadataGeneration",
          },
          ExpressionAttributeValues: {
            ":session": JSON.stringify(session),
            ":expires": defaultExpiry,
            ":generation": sessionId,
          },
        });
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("updates session with provided expiry when session.expires is set", async () => {
      const sessionId = "test-session-id";
      const customExpiry = 2000000;
      const session = { expires: customExpiry } as Session;
      const callback = vi.fn();

      mockDynamoDbClient.update.mockResolvedValue({});

      store.set(sessionId, session, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionId },
          UpdateExpression:
            "SET #session = :session, #expires = :expires, #generation = :generation",
          ExpressionAttributeNames: {
            "#session": "session",
            "#expires": "expires",
            "#generation": "__fastifySessionMetadataGeneration",
          },
          ExpressionAttributeValues: {
            ":session": JSON.stringify(session),
            ":expires": customExpiry,
            ":generation": sessionId,
          },
        });
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("uses __fastifySessionMetadata.generation when present", async () => {
      const sessionId = "test-session-id";
      const generation = "new-session-id";
      const session = {
        __fastifySessionMetadata: { generation },
      } as unknown as Session;
      const callback = vi.fn();

      mockDynamoDbClient.update.mockResolvedValue({});

      store.set(sessionId, session, callback);

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            ExpressionAttributeValues: expect.objectContaining({
              ":generation": generation,
            }),
          }),
        );
      });
    });

    it("calls callback with error when update fails", async () => {
      const sessionId = "test-session-id";
      const session = {} as Session;
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
      const expiredTime = mockNow - 1;

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
      const expiredTime = mockNow - 1;
      const error = new Error("Delete failed");

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
      const futureTime = mockNow + 1;
      const sessionData = { userId: "123" };

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

  describe("compareAndSet", () => {
    it("updates session when session exists and generation matches", async () => {
      const sessionStoreId = "test-session-store-id";
      const expectedGeneration = "old-session-id";
      const generation = "new-session-id";
      const session = {
        __fastifySessionMetadata: { generation },
      } as unknown as Session;
      const callback = vi.fn();

      mockDynamoDbClient.update.mockResolvedValue({});

      store.compareAndSet(
        sessionStoreId,
        expectedGeneration,
        session,
        callback,
      );

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith({
          TableName: tableName,
          Key: { id: sessionStoreId },
          UpdateExpression:
            "SET #session = :session, #expires = :expires, #generation = :newGeneration",
          ConditionExpression:
            "attribute_exists(#id) AND #generation = :expectedGeneration",
          ExpressionAttributeNames: {
            "#id": "id",
            "#session": "session",
            "#expires": "expires",
            "#generation": "__fastifySessionMetadataGeneration",
          },
          ExpressionAttributeValues: {
            ":session": JSON.stringify(session),
            ":expires": defaultExpiry,
            ":expectedGeneration": expectedGeneration,
            ":newGeneration": generation,
          },
        });
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("falls back to sessionStoreId as generation when __fastifySessionMetadata is absent", async () => {
      const sessionStoreId = "test-session-store-id";
      const expectedGeneration = "old-session-id";
      const session = {} as Session;
      const callback = vi.fn();

      mockDynamoDbClient.update.mockResolvedValue({});

      store.compareAndSet(
        sessionStoreId,
        expectedGeneration,
        session,
        callback,
      );

      await vi.waitFor(() => {
        expect(mockDynamoDbClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            ExpressionAttributeValues: expect.objectContaining({
              ":newGeneration": sessionStoreId,
            }),
          }),
        );
        expect(callback).toHaveBeenCalledWith(null);
      });
    });

    it("calls callback with ENOENT error when session does not exist or generation does not match", async () => {
      const sessionStoreId = "test-session-store-id";
      const expectedGeneration = "old-session-id";
      const session = {} as Session;
      const callback = vi.fn();
      const conditionalError = Object.assign(new Error("Condition failed"), {
        name: "ConditionalCheckFailedException",
      });

      mockDynamoDbClient.update.mockRejectedValue(conditionalError);

      store.compareAndSet(
        sessionStoreId,
        expectedGeneration,
        session,
        callback,
      );

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ code: "ENOENT" }),
        );
      });
    });

    it("calls callback with error when update fails for a non-conditional reason", async () => {
      const sessionStoreId = "test-session-store-id";
      const expectedGeneration = "old-session-id";
      const session = {} as Session;
      const callback = vi.fn();
      const error = new Error("DynamoDB error");

      mockDynamoDbClient.update.mockRejectedValue(error);

      store.compareAndSet(
        sessionStoreId,
        expectedGeneration,
        session,
        callback,
      );

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(error);
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
