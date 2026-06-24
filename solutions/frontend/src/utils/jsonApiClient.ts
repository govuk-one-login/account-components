import * as v from "valibot";
import { logger } from "../../../commons/utils/logger/index.js";
import { getPropsFromAPIGatewayEvent } from "../../../commons/utils/getPropsFromAPIGatewayEvent/index.js";
import type { APIGatewayProxyEvent } from "aws-lambda";

export abstract class JsonApiClient {
  private readonly errorScope: string;
  protected static readonly unknownError = {
    success: false,
    error: "UnknownError",
    rawResponse: undefined,
  } as const;
  protected static readonly undefinedSchema = v.undefined();
  protected fetch: typeof fetch;

  constructor(errorScope: string, event?: APIGatewayProxyEvent) {
    this.errorScope = errorScope;

    const propsFromEvent = event
      ? getPropsFromAPIGatewayEvent(event)
      : undefined;

    this.fetch = async (...args: Parameters<typeof fetch>) => {
      args[1] = {
        signal: AbortSignal.timeout(10000),
        ...args[1],
        headers: {
          ...(propsFromEvent?.persistentSessionId
            ? {
                "di-persistent-session-id": propsFromEvent.persistentSessionId,
              }
            : {}),
          ...(propsFromEvent?.sessionId
            ? { "session-id": propsFromEvent.sessionId }
            : {}),
          ...(propsFromEvent?.clientSessionId
            ? {
                "client-session-id": propsFromEvent.clientSessionId,
              }
            : {}),
          ...(propsFromEvent?.userLanguage
            ? { "user-language": propsFromEvent.userLanguage }
            : {}),
          ...(propsFromEvent?.sourceIp
            ? { "x-forwarded-for": propsFromEvent.sourceIp }
            : {}),
          ...(propsFromEvent?.txmaAuditEncoded
            ? {
                "txma-audit-encoded": propsFromEvent.txmaAuditEncoded,
              }
            : {}),
          // eslint-disable-next-line @typescript-eslint/no-misused-spread
          ...args[1]?.headers,
        },
      };
      return await fetch(...args);
    };
  }

  protected async logOnError<
    T extends
      | { readonly success: true }
      | {
          readonly success: false;
          readonly error: string;
          readonly errorDetails: unknown;
          readonly rawResponse?: Response | undefined;
        },
  >(methodName: string, fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    if (!result.success) {
      logger.error({
        method: methodName,
        message: this.errorScope,
        error: result.error,
        errorDetails: result.errorDetails,
        responseStatusCode: result.rawResponse?.status,
        responseStatus: result.rawResponse?.statusText,
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
        readonly rawResponse: Response;
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
        readonly errorDetails: unknown;
        readonly rawResponse: Response;
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
      } catch (error) {
        return {
          success: false,
          error: "ErrorParsingResponseBodyJson",
          rawResponse: response,
          errorDetails: error instanceof Error ? error.message : undefined,
        };
      }

      const body = v.safeParse(successResponseBodySchema, responseJson);
      if (!body.success) {
        return {
          success: false,
          error: "ErrorValidatingResponseBody",
          rawResponse: response,
          errorDetails: {
            issues: body.issues.map((issue) => ({
              kind: issue.kind,
              type: issue.type,
              expected: issue.expected,
              path: issue.path
                ?.map((item) => ("key" in item ? item.key : undefined))
                .join("."),
            })),
          },
        };
      }
      return {
        success: true,
        result: body.output,
        rawResponse: response,
      };
    }

    const errorResponseBodySchema = v.object({
      code: v.optional(v.number()),
      message: v.string(),
    });

    let responseJson: unknown;
    try {
      responseJson = await response.json();
    } catch (error) {
      return {
        success: false,
        error: "ErrorParsingErrorResponseBodyJson",
        rawResponse: response,
        errorDetails: error instanceof Error ? error.message : undefined,
      };
    }

    const body = v.safeParse(errorResponseBodySchema, responseJson);

    if (!body.success) {
      return {
        success: false,
        error: "ErrorValidatingErrorResponseBody",
        rawResponse: response,
        errorDetails: {
          issues: body.issues.map((issue) => ({
            kind: issue.kind,
            type: issue.type,
            expected: issue.expected,
            path: issue.path
              ?.map((item) => ("key" in item ? item.key : undefined))
              .join("."),
          })),
        },
      };
    }

    if (
      body.output.code === undefined ||
      !Object.keys(errorCodesMap).includes(body.output.code.toString())
    ) {
      return {
        success: false,
        error: "UnknownErrorResponse",
        rawResponse: response,
        errorDetails: {
          code: body.output.code,
          message: body.output.message,
        },
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
      errorDetails: {
        code: body.output.code,
        message: body.output.message,
      },
    };
  }
}
