import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as v from "valibot";
import { JsonApiClient } from "./index.js";

const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
}));

// @ts-expect-error
vi.mock(import("../logger/index.js"), () => ({
  logger: mockLogger,
}));

class TestJsonApiClient extends JsonApiClient {
  public get testBaseUrl() {
    return this.baseUrl;
  }

  public testLogOnError<T extends { success: boolean; error?: string }>(
    methodName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.logOnError(methodName, fn);
  }

  public static testProcessResponse<
    TSuccess,
    const TErrorMap extends Record<string, string>,
  >(
    response: Response,
    successResponseBodySchema: v.GenericSchema<unknown, TSuccess>,
    errorCodesMap: TErrorMap,
  ) {
    return JsonApiClient.processResponse(
      response,
      successResponseBodySchema,
      errorCodesMap,
    );
  }

  public static get testUndefinedSchema() {
    return JsonApiClient.undefinedSchema;
  }

  public static get testUnknownError() {
    return JsonApiClient.unknownError;
  }
}

describe("jsonApiClient", () => {
  let client: TestJsonApiClient;

  beforeEach(() => {
    client = new TestJsonApiClient("https://api.example.com", "TestService");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with baseUrl", () => {
      expect(client.testBaseUrl).toBe("https://api.example.com");
    });
  });

  describe("static properties", () => {
    it("should have unknownError constant", () => {
      expect(TestJsonApiClient.testUnknownError).toStrictEqual({
        success: false,
        error: "UnknownError",
      });
    });

    it("should have undefinedSchema", () => {
      expect(TestJsonApiClient.testUndefinedSchema).toBeDefined();
    });
  });

  describe("logOnError", () => {
    it("should not log when function returns success", async () => {
      const successFn = vi.fn().mockResolvedValue({ success: true });

      const result = await client.testLogOnError("testMethod", successFn);

      expect(result).toStrictEqual({ success: true });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should log error when function returns failure", async () => {
      const errorFn = vi
        .fn()
        .mockResolvedValue({ success: false, error: "TestError" });

      const result = await client.testLogOnError("testMethod", errorFn);

      expect(result).toStrictEqual({ success: false, error: "TestError" });
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: "TestService",
        error: "TestError",
        method: "testMethod",
      });
    });

    it("should log error when function returns failure without error message", async () => {
      const errorFn = vi.fn().mockResolvedValue({ success: false });

      const result = await client.testLogOnError("testMethod", errorFn);

      expect(result).toStrictEqual({ success: false });
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: "TestService",
        error: undefined,
        method: "testMethod",
      });
    });
  });

  describe("processResponse", () => {
    describe("successful responses", () => {
      it("should handle successful response with undefined schema", async () => {
        const response = {
          ok: true,
          json: vi.fn(),
        } as unknown as Response;
        const schema = TestJsonApiClient.testUndefinedSchema;
        const errorMap = {};

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: true,
          result: undefined,
          rawResponse: response,
        });
        expect(response.json).not.toHaveBeenCalled();
      });

      it("should handle successful response with valid JSON", async () => {
        const responseData = { id: 1, name: "test" };
        const response = {
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        } as unknown as Response;
        const schema = v.object({
          id: v.number(),
          name: v.string(),
        });
        const errorMap = {};

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: true,
          result: responseData,
          rawResponse: response,
        });
      });

      it("should handle invalid JSON in successful response", async () => {
        const response = {
          ok: true,
          json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        } as unknown as Response;
        const schema = v.string();
        const errorMap = {};

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "ErrorParsingResponseBodyJson",
          rawResponse: response,
        });
      });

      it("should return error when response body doesn't match schema", async () => {
        const responseData = { id: "invalid", name: "test" };
        const response = {
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        } as unknown as Response;
        const schema = v.object({
          id: v.number(),
          name: v.string(),
        });
        const errorMap = {};

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "ErrorParsingResponseBody",
          rawResponse: response,
        });
      });
    });

    describe("error responses", () => {
      it("should handle known error codes", async () => {
        const errorResponse = { code: 400, message: "Bad Request" };
        const response = {
          ok: false,
          json: vi.fn().mockResolvedValue(errorResponse),
        } as unknown as Response;
        const schema = v.string();
        const errorMap = { "400": "BadRequest" };

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "BadRequest",
          rawResponse: response,
        });
      });

      it("should handle unknown error codes", async () => {
        const errorResponse = { code: 500, message: "Internal Server Error" };
        const response = {
          ok: false,
          json: vi.fn().mockResolvedValue(errorResponse),
        } as unknown as Response;
        const schema = v.string();
        const errorMap = { "400": "BadRequest" };

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "UnknownErrorResponse",
          rawResponse: response,
        });
      });

      it("should handle invalid error response body", async () => {
        const response = {
          ok: false,
          json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        } as unknown as Response;
        const schema = v.string();
        const errorMap = { "400": "BadRequest" };

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "ErrorParsingResponseBodyJson",
          rawResponse: response,
        });
      });

      it("should handle error response with missing fields", async () => {
        const errorResponse = { code: 400 };
        const response = {
          ok: false,
          json: vi.fn().mockResolvedValue(errorResponse),
        } as unknown as Response;
        const schema = v.string();
        const errorMap = { "400": "BadRequest" };

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "ErrorParsingResponseBody",
          rawResponse: response,
        });
      });

      it("should handle error response with wrong field types", async () => {
        const errorResponse = { code: "400", message: 123 };
        const response = {
          ok: false,
          json: vi.fn().mockResolvedValue(errorResponse),
        } as unknown as Response;
        const schema = v.string();
        const errorMap = { "400": "BadRequest" };

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "ErrorParsingResponseBody",
          rawResponse: response,
        });
      });
    });

    describe("edge cases", () => {
      it("should handle empty error map", async () => {
        const errorResponse = { code: 400, message: "Bad Request" };
        const response = new Response(JSON.stringify(errorResponse), {
          status: 400,
        });
        const schema = v.string();
        const errorMap = {};

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "UnknownErrorResponse",
          rawResponse: response,
        });
      });

      it("should handle numeric error codes as strings in map", async () => {
        const errorResponse = { code: 404, message: "Not Found" };
        const response = new Response(JSON.stringify(errorResponse), {
          status: 404,
        });
        const schema = v.string();
        const errorMap = { "404": "NotFound", "500": "ServerError" };

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: false,
          error: "NotFound",
          rawResponse: response,
        });
      });

      it("should handle complex success schema", async () => {
        const responseData = {
          users: [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ],
          meta: { total: 2, page: 1 },
        };
        const response = new Response(JSON.stringify(responseData), {
          status: 200,
        });
        const schema = v.object({
          users: v.array(
            v.object({
              id: v.number(),
              name: v.string(),
            }),
          ),
          meta: v.object({
            total: v.number(),
            page: v.number(),
          }),
        });
        const errorMap = {};

        const result = await TestJsonApiClient.testProcessResponse(
          response,
          schema,
          errorMap,
        );

        expect(result).toStrictEqual({
          success: true,
          result: responseData,
          rawResponse: response,
        });
      });
    });
  });
});
