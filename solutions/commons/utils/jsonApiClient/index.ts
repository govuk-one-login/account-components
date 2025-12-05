import * as v from "valibot";
import { logger } from "../logger/index.js";
import { getPropsForLoggingFromEvent } from "../getPropsForLoggingFromEvent/index.js";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { getTxmaAuditEncodedFromEvent } from "../getTxmaAuditEncodedFromEvent/index.js";

export abstract class JsonApiClient {
  private readonly errorScope: string;
  protected static readonly unknownError = {
    success: false,
    error: "UnknownError",
  } as const;
  protected static readonly undefinedSchema = v.undefined();
  protected commonHeaders: NonNullable<RequestInit["headers"]>;

  constructor(errorScope: string, event?: APIGatewayProxyEvent) {
    this.errorScope = errorScope;

    const propsForLoggingFromEvent = getPropsForLoggingFromEvent(event);
    const txmaAuditEncoded = getTxmaAuditEncodedFromEvent(event);

    this.commonHeaders = {
      ...(propsForLoggingFromEvent.persistentSessionId
        ? {
            "di-persistent-session-id":
              propsForLoggingFromEvent.persistentSessionId,
          }
        : {}),
      ...(propsForLoggingFromEvent.sessionId
        ? { "session-id": propsForLoggingFromEvent.sessionId }
        : {}),
      ...(propsForLoggingFromEvent.clientSessionId
        ? {
            "client-session-id": propsForLoggingFromEvent.clientSessionId,
          }
        : {}),
      ...(propsForLoggingFromEvent.userLanguage
        ? { "user-language": propsForLoggingFromEvent.userLanguage }
        : {}),
      ...(propsForLoggingFromEvent.sourceIp
        ? { "x-forwarded-for": propsForLoggingFromEvent.sourceIp }
        : {}),
      ...(txmaAuditEncoded
        ? {
            "txma-audit-encoded": txmaAuditEncoded,
          }
        : {}),
    };
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
          | "ErrorValidatingResponseBody"
          | "ErrorParsingErrorResponseBodyJson"
          | "ErrorValidatingErrorResponseBody"
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
          error: "ErrorValidatingResponseBody",
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
        error: "ErrorParsingErrorResponseBodyJson",
        rawResponse: response,
      };
    }

    const body = v.safeParse(errorResponseBodySchema, responseJson);

    if (!body.success) {
      return {
        success: false,
        error: "ErrorValidatingErrorResponseBody",
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
