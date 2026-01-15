import { describe, it, expect, vi } from "vitest";
import { handler } from "./index.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

// @ts-expect-error
vi.mock(import("../../../../commons/utils/logger/index.js"), () => ({
  logger: {},
  loggerAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// @ts-expect-error
vi.mock(import("../../../../commons/utils/metrics/index.js"), () => ({
  metrics: {},
  metricsAPIGatewayProxyHandlerWrapper: (fn) => fn,
}));

// eslint-disable-next-line vitest/prefer-import-in-mock
vi.mock("@aws-sdk/client-dynamodb", async (importOriginal) => {
  const actual =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    await importOriginal<typeof import("@aws-sdk/client-dynamodb")>();

  const mockClient = vi.fn(function () {
    return {
      send: vi.fn(),
      config: {},
      destroy: vi.fn(),
    };
  });

  return {
    ...actual,
    DynamoDBClient: Object.assign(mockClient, actual.DynamoDBClient),
  };
});

// eslint-disable-next-line vitest/prefer-import-in-mock
vi.mock("@aws-sdk/lib-dynamodb", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("@aws-sdk/lib-dynamodb")>();

  return {
    ...actual,
    DynamoDBDocumentClient: {
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...actual.DynamoDBDocumentClient,
      from: vi.fn().mockImplementation(() => ({
        send: vi.fn(),
      })),
    },
    paginateScan: vi.fn().mockImplementation(async function* () {
      yield { Items: [] };
    }),
  };
});

describe("getInactiveUsers handler", () => {
  it("returns 200 status with items body", async () => {
    const result = await handler({} as APIGatewayProxyEvent, {} as Context);

    expect(result).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify([]),
    });
  });
});
