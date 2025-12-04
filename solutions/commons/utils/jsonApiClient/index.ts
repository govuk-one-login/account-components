import * as v from "valibot";
import { logger } from "../logger/index.js";

export class JsonApiClient {
  protected readonly baseUrl: string;
  private readonly errorScope: string;
  protected static readonly unknownError = {
    success: false,
    error: "UnknownError",
  } as const;
  protected static readonly undefinedSchema = v.undefined();

  constructor(baseUrl: string, errorScope: string) {
    this.baseUrl = baseUrl;
    this.errorScope = errorScope;
  }

  protected async logOnError<T extends { success: boolean; error?: string }>(
    methodName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const result = await fn();
    if (!result.success) {
      logger.error({
        message: this.errorScope,
        error: result.error,
        method: methodName,
      });
    }
    return result;
  }

  protected static async processResponse<
    TSuccess,
    const TErrorMap extends Record<string, string>,
  >(
    response: Response,
    successResponseBodySchema: v.GenericSchema<unknown, TSuccess>,
    errorCodesMap: TErrorMap,
  ): Promise<
    | {
        readonly success: true;
        readonly result: TSuccess;
        rawResponse: Response;
      }
    | {
        readonly success: false;
        readonly error:
          | TErrorMap[keyof TErrorMap]
          | "ErrorParsingResponseBodyJson"
          | "ErrorParsingResponseBody"
          | "UnknownErrorResponse";
        rawResponse: Response;
      }
  > {
    if (response.ok) {
      if (
        // @ts-expect-error
        successResponseBodySchema === JsonApiClient.undefinedSchema
      ) {
        return {
          success: true,
          result: v.parse(successResponseBodySchema, undefined),
          rawResponse: response,
        };
      }

      let responseJson: unknown;
      try {
        responseJson = await response.json();
      } catch {
        return {
          success: false,
          error: "ErrorParsingResponseBodyJson",
          rawResponse: response,
        };
      }

      const body = v.safeParse(successResponseBodySchema, responseJson);
      if (!body.success) {
        return {
          success: false,
          error: "ErrorParsingResponseBody",
          rawResponse: response,
        };
      }
      return {
        success: true,
        result: body.output,
        rawResponse: response,
      };
    }

    const errorResponseBodySchema = v.object({
      code: v.number(),
      message: v.string(),
    });

    let responseJson: unknown;
    try {
      responseJson = await response.json();
    } catch {
      return {
        success: false,
        error: "ErrorParsingResponseBodyJson",
        rawResponse: response,
      };
    }

    const body = v.safeParse(errorResponseBodySchema, responseJson);

    if (!body.success) {
      return {
        success: false,
        error: "ErrorParsingResponseBody",
        rawResponse: response,
      };
    }

    if (!Object.keys(errorCodesMap).includes(body.output.code.toString())) {
      return {
        success: false,
        error: "UnknownErrorResponse",
        rawResponse: response,
      };
    }

    return {
      success: false,
      error:
        errorCodesMap[
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          body.output.code as unknown as keyof TErrorMap
        ],
      rawResponse: response,
    };
  }
}
