// eslint-disable-next-line no-restricted-imports
import type { LogLevel } from "@aws-lambda-powertools/logger/types";
import type { FastifyBaseLogger } from "fastify";
import type { Bindings, ChildLoggerOptions, LevelOrString } from "pino";
import { logger } from "../../observability/index.js";
// eslint-disable-next-line no-restricted-imports
import type { Logger } from "@aws-lambda-powertools/logger";

const powertoolsToPinoLevel: Record<string, LevelOrString> = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  CRITICAL: "fatal",
  TRACE: "trace",
  SILENT: "silent",
};

const pinoToPowertoolsLevel: Record<LevelOrString, LogLevel> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  fatal: "CRITICAL",
  trace: "TRACE",
  silent: "SILENT",
};

export class FastifyPowertoolsLogger implements FastifyBaseLogger {
  level: string;

  constructor() {
    const logLevelName = logger.getLevelName();
    const defaultLogLevel = "info";

    this.level = powertoolsToPinoLevel[logLevelName] ?? defaultLogLevel;
  }

  child(bindings: Bindings, options?: ChildLoggerOptions) {
    const { level: logLevel } = options ?? {};
    const defaultLogLevel = "INFO";

    const childLogger = logger.createChild({
      logLevel: logLevel
        ? (pinoToPowertoolsLevel[logLevel] ?? defaultLogLevel)
        : defaultLogLevel,
    });
    childLogger.appendPersistentKeys(bindings);

    return new FastifyPowertoolsChildLogger(childLogger);
  }

  fatal(details: object, msg?: string, ...args: unknown[]) {
    logger.critical(msg ?? "", { extraArgs: args, details: details });
  }

  error(details: object, msg?: string, ...args: unknown[]) {
    logger.error(msg ?? "", { extraArgs: args, details: details });
  }

  warn(details: object, msg?: string, ...args: unknown[]) {
    logger.warn(msg ?? "", { extraArgs: args, details: details });
  }

  info(details: object, msg?: string, ...args: unknown[]) {
    logger.info(msg ?? "", { extraArgs: args, details: details });
  }

  debug(details: object, msg?: string, ...args: unknown[]) {
    logger.debug(msg ?? "", { extraArgs: args, details: details });
  }

  trace(details: object, msg?: string, ...args: unknown[]) {
    logger.trace(msg ?? "", { extraArgs: args, details: details });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  silent(_details: object, _msg?: string, ..._args: unknown[]) {
    // Noop function
  }
}

/*
This child class is required to satisfy the FastifyBaseLogger interface.
It expects the parent logger not to accept any parameters but expects the
child logger to access a logger instance parameter.
*/
class FastifyPowertoolsChildLogger extends FastifyPowertoolsLogger {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // @ts-expect-error
  constructor(logger: Logger) {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    super();
  }
}
