import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@aws-sdk/client-dynamodb"));
vi.mock(import("@aws-sdk/lib-dynamodb"));
vi.mock(import("../getAwsClientConfig/index.js"));
vi.mock(import("../../getEnvironment/index.js"));
vi.mock(import("../tracer.js"));

const mockDynamoDbClient = {
  config: { region: "eu-west-2" },
};

const mockDocClient = {
  config: { region: "eu-west-2" },
  send: vi.fn(),
};

const mockCommands = {
  PutCommand: vi.fn(),
  GetCommand: vi.fn(),
  DeleteCommand: vi.fn(),
  UpdateCommand: vi.fn(),
  QueryCommand: vi.fn(),
  ScanCommand: vi.fn(),
  BatchWriteCommand: vi.fn(),
  BatchGetCommand: vi.fn(),
  TransactWriteCommand: vi.fn(),
};

describe("getDynamoDbClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@aws-sdk/client-dynamodb", () => ({
      DynamoDBClient: vi.fn(function () {
        return mockDynamoDbClient;
      }),
      QueryCommand: mockCommands.QueryCommand,
      ScanCommand: mockCommands.ScanCommand,
    }));
    vi.doMock("@aws-sdk/lib-dynamodb", () => ({
      DynamoDBDocumentClient: {
        from: vi.fn(() => mockDocClient),
      },
      PutCommand: mockCommands.PutCommand,
      GetCommand: mockCommands.GetCommand,
      DeleteCommand: mockCommands.DeleteCommand,
      UpdateCommand: mockCommands.UpdateCommand,
      BatchWriteCommand: mockCommands.BatchWriteCommand,
      BatchGetCommand: mockCommands.BatchGetCommand,
      TransactWriteCommand: mockCommands.TransactWriteCommand,
    }));
    vi.doMock("../getAwsClientConfig/index.js", () => ({
      getAwsClientConfig: vi.fn(() => ({ region: "eu-west-2" })),
    }));
    vi.doMock("../../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "local"),
    }));
    vi.doMock("../tracer.js", () => ({
      tracer: { captureAWSv3Client: vi.fn(<T>(client: T): T => client) },
    }));
  });

  it("returns cached client on subsequent calls", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client1 = getDynamoDbClient();
    const client2 = getDynamoDbClient();

    expect(client1).toBe(client2);
  });

  it("returns client with all methods", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();

    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.put).toBeTypeOf("function");
    expect(client.get).toBeTypeOf("function");
    expect(client.delete).toBeTypeOf("function");
    expect(client.update).toBeTypeOf("function");
    expect(client.query).toBeTypeOf("function");
    expect(client.scan).toBeTypeOf("function");
    expect(client.batchWrite).toBeTypeOf("function");
    expect(client.batchGet).toBeTypeOf("function");
    expect(client.transactWrite).toBeTypeOf("function");
  });

  it("put method calls client.send with PutCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = { TableName: "test-table", Item: { id: "test" } };

    await client.put(params);

    expect(mockCommands.PutCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("get method calls client.send with GetCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = { TableName: "test-table", Key: { id: "test" } };

    await client.get(params);

    expect(mockCommands.GetCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("delete method calls client.send with DeleteCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = { TableName: "test-table", Key: { id: "test" } };

    await client.delete(params);

    expect(mockCommands.DeleteCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("update method calls client.send with UpdateCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = {
      TableName: "test-table",
      Key: { id: "test" },
      UpdateExpression: "SET #a = :val",
      ExpressionAttributeNames: { "#a": "attr" },
      ExpressionAttributeValues: { ":val": "value" },
    };

    await client.update(params);

    expect(mockCommands.UpdateCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("query method calls client.send with QueryCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = {
      TableName: "test-table",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": "test" },
    };

    await client.query(params);

    expect(mockCommands.QueryCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("scan method calls client.send with ScanCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = { TableName: "test-table" };

    await client.scan(params);

    expect(mockCommands.ScanCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("batchWrite method calls client.send with BatchWriteCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = {
      RequestItems: {
        "test-table": [{ PutRequest: { Item: { id: "test" } } }],
      },
    };

    await client.batchWrite(params);

    expect(mockCommands.BatchWriteCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("batchGet method calls client.send with BatchGetCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = {
      RequestItems: { "test-table": { Keys: [{ id: "test" }] } },
    };

    await client.batchGet(params);

    expect(mockCommands.BatchGetCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("transactWrite method calls client.send with TransactWriteCommand", async () => {
    const { getDynamoDbClient } = await import("./index.js");

    const client = getDynamoDbClient();
    const params = {
      TransactItems: [
        { Put: { TableName: "test-table", Item: { id: "test" } } },
      ],
    };

    await client.transactWrite(params);

    expect(mockCommands.TransactWriteCommand).toHaveBeenCalledWith(params);
    expect(mockDocClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("wraps client with XRay when not in local environment", async () => {
    vi.resetModules();

    const mockCaptureAWSv3Client = vi.fn(<T>(client: T): T => client);

    vi.doMock("../../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "production"),
    }));

    vi.doMock("../tracer.js", () => ({
      tracer: { captureAWSv3Client: mockCaptureAWSv3Client },
    }));

    const { getDynamoDbClient } = await import("./index.js");
    getDynamoDbClient();

    expect(mockCaptureAWSv3Client).toHaveBeenCalledWith(expect.any(Object));
  });
});
